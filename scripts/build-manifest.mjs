// Genera public/modules/manifest.json a partir de los módulos de e-Sword de esa carpeta.
// Omite los módulos cifrados por e-Sword (no se pueden leer fuera de e-Sword).
import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import { unzlibSync } from "fflate";

const dir = "public/modules";
const EXT = {
  bblx: "bible", bbl: "bible", cmtx: "commentary", cmt: "commentary",
  dctx: "dictionary", dct: "dictionary", lexx: "dictionary",
  refx: "reference", ref: "reference", topx: "topic", top: "topic",
  devx: "devotional", dev: "devotional", notx: "notes", not: "notes",
  harx: "harmony", har: "harmony", mapx: "map", map: "map", lstx: "list", lst: "list",
};
const CONTENT = [
  ["Bible", "Scripture"], ["Dictionary", "Definition"], ["Lexicon", "Definition"],
  ["VerseCommentary", "Comments"], ["Verses", "Comments"], ["Commentary", "Comments"],
  ["Devotional", "Devotion"], ["Reference", "Content"], ["Topics", "Notes"],
];
const utf8 = new TextDecoder("utf-8", { fatal: true });

function readable(b) {
  if (!(b instanceof Uint8Array)) return true;
  if (b.length > 5 && b[4] === 0x78) {
    try { unzlibSync(b.subarray(4)); return true; } catch { /* no zlib */ }
  }
  try { utf8.decode(b); return true; } catch { return false; }
}

function isEncrypted(db) {
  const tables = (db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values ?? []).map((v) => String(v[0]));
  for (const [t, c] of CONTENT) {
    const real = tables.find((x) => x.toLowerCase() === t.toLowerCase());
    if (!real) continue;
    try {
      const rows = db.exec(`SELECT "${c}" FROM "${real}" WHERE typeof("${c}")='blob' LIMIT 5`)[0]?.values ?? [];
      if (rows.some((r) => !readable(r[0]))) return true;
    } catch { /* otra columna */ }
  }
  return false;
}

fs.mkdirSync(dir, { recursive: true });
const SQL = await initSqlJs();
const out = [];
const skipped = [];

for (const f of fs.readdirSync(dir).sort()) {
  const kind = EXT[path.extname(f).slice(1).toLowerCase()];
  if (!kind) continue;
  const st = fs.statSync(path.join(dir, f));
  let title = f;
  let abbreviation = "";
  try {
    const db = new SQL.Database(fs.readFileSync(path.join(dir, f)));
    if (isEncrypted(db)) {
      skipped.push(f);
      db.close();
      continue;
    }
    const info = (db.exec("PRAGMA table_info(Details)")[0]?.values ?? []).map((v) => String(v[1]));
    const find = (names) => names.map((n) => info.find((c) => c.toLowerCase() === n.toLowerCase())).find(Boolean);
    const t = find(["Title", "Description"]);
    const a = find(["Abbreviation"]);
    if (t || a) {
      const row = db.exec(`SELECT ${t ? `"${t}"` : "''"}, ${a ? `"${a}"` : "''"} FROM Details LIMIT 1`)[0]?.values[0];
      if (row?.[0]) title = String(row[0]);
      if (row?.[1]) abbreviation = String(row[1]);
    }
    db.close();
  } catch (e) {
    console.warn(`No se pudo leer ${f}:`, e.message);
  }
  out.push({
    id: `builtin:${f}`,
    filename: f,
    kind,
    title,
    abbreviation,
    builtin: true,
    url: `/modules/${encodeURIComponent(f)}`,
    version: `${st.size}-${Math.floor(st.mtimeMs)}`,
  });
}

fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(out, null, 2));
console.log(`manifest.json: ${out.length} módulos`);
if (skipped.length) {
  console.warn(`Omitidos (cifrados por e-Sword, no se pueden leer):\n  - ${skipped.join("\n  - ")}`);
}
