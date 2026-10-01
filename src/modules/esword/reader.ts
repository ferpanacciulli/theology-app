import initSqlJs from "sql.js";
import type { Database, SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import type { ModuleKind } from "../types";
import { blobToText } from "./blob";
import { decodeEntities } from "./entities";

let sqlPromise: Promise<SqlJsStatic> | null = null;

function getSql() {
  if (!sqlPromise) sqlPromise = initSqlJs({ locateFile: () => wasmUrl });
  return sqlPromise;
}

const EXT_KIND: Record<string, ModuleKind> = {
  bblx: "bible", bbl: "bible",
  cmtx: "commentary", cmt: "commentary",
  dctx: "dictionary", dct: "dictionary", lexx: "dictionary",
  refx: "reference", ref: "reference",
  topx: "topic", top: "topic",
  devx: "devotional", dev: "devotional",
  notx: "notes", not: "notes",
  harx: "harmony", har: "harmony",
  mapx: "map", map: "map",
  lstx: "list", lst: "list",
};

export function kindFromFilename(name: string): ModuleKind | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_KIND[ext] ?? null;
}

export async function openModule(data: ArrayBuffer): Promise<Database> {
  const SQL = await getSql();
  return new SQL.Database(new Uint8Array(data));
}

export function all<T>(db: Database, sql: string, params: (string | number)[] = []): T[] {
  const st = db.prepare(sql);
  try {
    st.bind(params);
    const rows: T[] = [];
    while (st.step()) rows.push(st.getAsObject() as T);
    return rows;
  } finally {
    st.free();
  }
}

export function readDetails(db: Database): { title: string; abbreviation: string } {
  try {
    const cols = columns(db, "Details");
    const t = pick(cols, ["Title", "Description"]);
    const a = pick(cols, ["Abbreviation"]);
    if (!t && !a) return { title: "", abbreviation: "" };
    const [d] = all<{ t?: string; a?: string }>(
      db,
      `SELECT ${t ? `"${t}"` : "''"} AS t, ${a ? `"${a}"` : "''"} AS a FROM Details LIMIT 1`
    );
    return { title: decodeEntities(d?.t ?? ""), abbreviation: decodeEntities(d?.a ?? "") };
  } catch {
    return { title: "", abbreviation: "" };
  }
}

// ---------- introspección de esquema ----------

export function listTables(db: Database): string[] {
  return all<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).map((r) => r.name);
}

export function hasTable(db: Database, name: string): boolean {
  return listTables(db).some((t) => t.toLowerCase() === name.toLowerCase());
}

export function columns(db: Database, table: string): string[] {
  if (!listTables(db).includes(table)) return [];
  return all<{ name: string }>(db, `PRAGMA table_info("${table}")`).map((r) => r.name);
}

function pick(cols: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const f = cols.find((x) => x.toLowerCase() === c.toLowerCase());
    if (f) return f;
  }
  return null;
}

function contentTable(db: Database, preferred: RegExp): string | null {
  const tables = listTables(db);
  return (
    tables.find((t) => preferred.test(t)) ??
    tables.find((t) => !/^(details|sqlite)/i.test(t)) ??
    null
  );
}

export function describeModule(db: Database) {
  return listTables(db).map((table) => {
    let rows = 0;
    try {
      rows = all<{ n: number }>(db, `SELECT COUNT(*) AS n FROM "${table}"`)[0]?.n ?? 0;
    } catch {
      /* ignorar */
    }
    return { table, columns: columns(db, table), rows };
  });
}

export function sampleRows(db: Database, table: string, limit = 50): Record<string, unknown>[] {
  if (!listTables(db).includes(table)) return [];
  return all<Record<string, unknown>>(db, `SELECT * FROM "${table}" LIMIT ${limit}`);
}

// ---------- Biblias ----------

export function getChapterVerses(
  db: Database,
  book: number,
  chapter: number
): { Verse: number; Scripture: string }[] {
  try {
    return all<{ Verse: number; Scripture: unknown }>(
      db,
      "SELECT Verse, Scripture FROM Bible WHERE Book = ? AND Chapter = ? ORDER BY Verse",
      [book, chapter]
    ).map((r) => ({ Verse: r.Verse, Scripture: blobToText(r.Scripture) ?? "" }));
  } catch {
    return [];
  }
}

// ---------- Comentarios ----------

export interface CommentEntry {
  kind: "verse" | "chapter" | "book";
  text: string;
}

/** Comentarios por rango de versículos en una tabla (Verses o Commentary). */
function queryRange(db: Database, table: string, book: number, chapter: number, verse: number): string[] {
  const cols = columns(db, table);
  const cBook = pick(cols, ["Book"]);
  const cb = pick(cols, ["ChapterBegin", "Chapter"]);
  const vb = pick(cols, ["VerseBegin", "Verse"]);
  const ce = pick(cols, ["ChapterEnd"]);
  const ve = pick(cols, ["VerseEnd"]);
  const text = pick(cols, ["Comments", "Comment", "Commentary", "Text", "Content", "Data"]);
  if (!cBook || !cb || !vb || !text) {
    throw new Error(`Esquema de comentario no reconocido (${table}: ${cols.join(", ")})`);
  }
  // Fin 0/NULL = mismo que el inicio.
  const endC = ce ? `COALESCE(NULLIF("${ce}",0),"${cb}")` : `"${cb}"`;
  const endV = ve ? `COALESCE(NULLIF("${ve}",0),"${vb}")` : `"${vb}"`;
  return all<Record<string, unknown>>(
    db,
    `SELECT "${text}" AS t FROM "${table}"
     WHERE "${cBook}" = ? AND (
       ("${cb}" <= ? AND ${endC} >= ?
         AND ("${cb}" < ? OR "${vb}" <= ?)
         AND (${endC} > ? OR ${endV} >= ?))
       OR ("${vb}" = 0 AND "${cb}" = ?)
     )`,
    [book, chapter, chapter, chapter, verse, chapter, verse, chapter]
  )
    .map((r) => blobToText(r.t))
    .filter((t): t is string => !!t);
}

function queryByKey(db: Database, table: string, keys: Record<string, number>): string[] {
  const cols = columns(db, table);
  const text = pick(cols, ["Comments", "Comment", "Text", "Content", "Data"]);
  const where: string[] = [];
  const params: number[] = [];
  for (const [k, v] of Object.entries(keys)) {
    const c = pick(cols, [k]);
    if (!c) return [];
    where.push(`"${c}" = ?`);
    params.push(v);
  }
  if (!text) return [];
  return all<Record<string, unknown>>(
    db,
    `SELECT "${text}" AS t FROM "${table}" WHERE ${where.join(" AND ")}`,
    params
  )
    .map((r) => blobToText(r.t))
    .filter((t): t is string => !!t);
}

/**
 * Comentarios para book:chapter:verse. Soporta el esquema clásico (una tabla
 * Commentary) y el de tres niveles (Verses / Chapters / Books).
 */
export function getComments(db: Database, book: number, chapter: number, verse: number): CommentEntry[] {
  const tables = listTables(db);
  const findRe = (re: RegExp) => tables.find((t) => re.test(t));
  const verses = findRe(/^(verses|versecommentary)$/i);
  const chapters = findRe(/^(chapters|chaptercommentary)$/i);
  const booksT = findRe(/^(books|bookcommentary)$/i);

  if (verses || chapters || booksT) {
    const out: CommentEntry[] = [];
    if (verses) {
      for (const text of queryRange(db, verses, book, chapter, verse)) out.push({ kind: "verse", text });
    }
    if (chapters) {
      for (const text of queryByKey(db, chapters, { Book: book, Chapter: chapter })) {
        out.push({ kind: "chapter", text });
      }
    }
    if (booksT) {
      for (const text of queryByKey(db, booksT, { Book: book })) out.push({ kind: "book", text });
    }
    return out;
  }

  const table = contentTable(db, /^(commentary|commentaries|comments)$/i);
  if (!table) throw new Error("El módulo no tiene tablas de contenido.");
  return queryRange(db, table, book, chapter, verse).map((text) => ({ kind: "verse" as const, text }));
}

// ---------- Diccionarios ----------

export interface DictSchema {
  table: string;
  word: string;
  def: string;
}

export function getDictionarySchema(db: Database): DictSchema | null {
  const table = contentTable(db, /^(dictionary|dictionaries|lexicon|words)$/i);
  if (!table) return null;
  const cols = columns(db, table);
  const word = pick(cols, ["Word", "Topic", "Title", "Term", "Entry", "Name"]) ?? cols[0];
  const def =
    pick(cols, ["Definition", "Description", "Content", "Text", "Data", "Meaning", "Comments"]) ??
    cols.find((c) => c !== word);
  return word && def ? { table, word, def } : null;
}

export function searchWords(db: Database, prefix: string, limit = 200): string[] {
  const s = getDictionarySchema(db);
  if (!s) return [];
  return all<Record<string, string>>(
    db,
    `SELECT "${s.word}" AS w FROM "${s.table}" WHERE "${s.word}" LIKE ? ORDER BY "${s.word}" LIMIT ${limit}`,
    [`${prefix}%`]
  ).map((r) => decodeEntities(r.w));
}

export function getDefinition(db: Database, word: string): string | null {
  const s = getDictionarySchema(db);
  if (!s) return null;
  // Strong: probar G1234, G01234 y G1234 sin ceros.
  const m = word.match(/^([GHgh])0*(\d+)$/);
  const variants = m
    ? [word, `${m[1]}${m[2]}`, `${m[1]}${m[2].padStart(4, "0")}`, `${m[1]}${m[2].padStart(5, "0")}`]
    : [word];
  for (const v of variants) {
    const [r] = all<Record<string, unknown>>(
      db,
      `SELECT "${s.def}" AS d FROM "${s.table}" WHERE "${s.word}" = ? COLLATE NOCASE LIMIT 1`,
      [v]
    );
    const t = blobToText(r?.d);
    if (t) return t;
  }
  return null;
}

// ---------- Referencias, devocionales y mapas/gráficos ----------

export interface EntryLayout {
  table: string;
  title: string; // expresión SQL
  body: string;
  pic: string | null;
}

const LAYOUTS: EntryLayout[] = [
  { table: "Topics", title: '"Title"', body: "Notes", pic: null },
  { table: "Reference", title: '"Chapter"', body: "Content", pic: null },
  { table: "Devotional", title: `"Month" || '/' || "Day"`, body: "Devotion", pic: null },
  { table: "Graphics", title: '"Title"', body: "Details", pic: "Picture" },
];

export function entryLayout(db: Database): EntryLayout | null {
  const tables = listTables(db);
  for (const l of LAYOUTS) {
    const t = tables.find((x) => x.toLowerCase() === l.table.toLowerCase());
    if (t) return { ...l, table: t };
  }
  return null;
}

export function listEntries(db: Database, l: EntryLayout): { id: number; title: string }[] {
  return all<{ id: number; title: unknown }>(
    db,
    `SELECT rowid AS id, ${l.title} AS title FROM "${l.table}" ORDER BY rowid`
  ).map((r) => ({ id: r.id, title: decodeEntities(String(r.title ?? "").trim()) || `#${r.id}` }));
}

export function getEntry(
  db: Database,
  l: EntryLayout,
  id: number
): { body: string | null; pic: Uint8Array | null } {
  const [r] = all<Record<string, unknown>>(
    db,
    `SELECT "${l.body}" AS body${l.pic ? `, "${l.pic}" AS pic` : ""} FROM "${l.table}" WHERE rowid = ?`,
    [id]
  );
  return {
    body: r ? blobToText(r.body) : "",
    pic: r?.pic instanceof Uint8Array ? r.pic : null,
  };
}

// ---------- Módulos cifrados por e-Sword ----------

const CONTENT: [string, string][] = [
  ["Bible", "Scripture"], ["Dictionary", "Definition"], ["Lexicon", "Definition"],
  ["VerseCommentary", "Comments"], ["Verses", "Comments"], ["Commentary", "Comments"],
  ["Devotional", "Devotion"], ["Reference", "Content"], ["Topics", "Notes"],
];

/** true si el contenido está cifrado (los BLOB no son texto ni zlib). */
export function isEncrypted(db: Database): boolean {
  const tables = listTables(db);
  for (const [t, c] of CONTENT) {
    const real = tables.find((x) => x.toLowerCase() === t.toLowerCase());
    if (!real) continue;
    try {
      const rows = all<Record<string, unknown>>(
        db,
        `SELECT "${c}" AS v FROM "${real}" WHERE typeof("${c}") = 'blob' LIMIT 5`
      );
      if (rows.some((r) => r.v instanceof Uint8Array && blobToText(r.v) === null)) return true;
    } catch {
      /* columna distinta */
    }
  }
  return false;
}

/** Todos los versículos de una Biblia (para construir el índice de búsqueda). */
export function getAllVerses(
  db: Database
): { Book: number; Chapter: number; Verse: number; Scripture: unknown }[] {
  return all(db, "SELECT Book, Chapter, Verse, Scripture FROM Bible ORDER BY Book, Chapter, Verse");
}
