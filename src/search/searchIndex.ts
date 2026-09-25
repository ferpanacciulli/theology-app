import { getModuleDb } from "../modules/useModuleDb";
import { getAllVerses, isEncrypted } from "../modules/esword/reader";
import { blobToText } from "../modules/esword/blob";
import { rtfToText } from "../modules/esword/markup";

export interface VerseEntry {
  book: number;
  chapter: number;
  verse: number;
  text: string;
  norm: string;
  strongs: string; // " G26 G3588 " o ""
}

export interface VerseIndex {
  entries: VerseEntry[];
  hasStrongs: boolean;
}

/** Minúsculas y sin tildes: "Jesús" == "jesus". */
export function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const cache = new Map<string, Promise<VerseIndex>>();

export function loadIndex(source: string): Promise<VerseIndex> {
  let p = cache.get(source);
  if (!p) {
    p = build(source);
    p.catch(() => cache.delete(source));
    cache.set(source, p);
  }
  return p;
}

interface RawVerse {
  Book: number;
  Chapter: number;
  Verse: number;
  Scripture: unknown;
}

async function build(source: string): Promise<VerseIndex> {
  await new Promise((r) => setTimeout(r, 0)); // deja pintar "Indexando…"
  let raw: RawVerse[];
  if (!source) {
    const mod = await import("../data/RVR60.json");
    raw = (mod.default as { verses: RawVerse[] }).verses;
  } else {
    const db = await getModuleDb(source);
    if (isEncrypted(db)) throw new Error("cifrado");
    raw = getAllVerses(db);
  }

  const entries: VerseEntry[] = [];
  let hasStrongs = false;
  for (const r of raw) {
    const s = blobToText(r.Scripture) ?? "";
    const strongs: string[] = [];
    if (source) {
      for (const m of s.matchAll(/<W([GH])(\d+)>/gi)) {
        strongs.push(`${m[1].toUpperCase()}${parseInt(m[2], 10)}`);
      }
    }
    const text = source ? rtfToText(s).replace(/\s+/g, " ").trim() : s;
    if (strongs.length) hasStrongs = true;
    entries.push({
      book: r.Book,
      chapter: r.Chapter,
      verse: r.Verse,
      text,
      norm: norm(text),
      strongs: strongs.length ? ` ${strongs.join(" ")} ` : "",
    });
  }
  return { entries, hasStrongs };
}

export interface ParsedQuery {
  terms: string[]; // normalizados; las frases entre comillas son un solo término
  strong: string | null; // "G26"
}

export function parseQuery(q: string): ParsedQuery {
  const trimmed = q.trim();
  const sm = trimmed.match(/^([gh])0*(\d+)$/i);
  if (sm) return { terms: [], strong: `${sm[1].toUpperCase()}${parseInt(sm[2], 10)}` };

  const terms: string[] = [];
  for (const m of trimmed.matchAll(/"([^"]+)"|(\S+)/g)) {
    const t = norm((m[1] ?? m[2]).trim());
    if (t) terms.push(t);
  }
  return { terms, strong: null };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function runSearch(
  index: VerseIndex,
  p: ParsedQuery,
  inScope: (book: number) => boolean,
  wholeWord: boolean
): VerseEntry[] {
  const out: VerseEntry[] = [];

  if (p.strong) {
    const key = ` ${p.strong} `;
    for (const e of index.entries) if (inScope(e.book) && e.strongs.includes(key)) out.push(e);
    return out;
  }
  if (!p.terms.length) return out;

  const res = wholeWord
    ? p.terms.map((t) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(t)}(?![\\p{L}\\p{N}])`, "u"))
    : null;

  for (const e of index.entries) {
    if (!inScope(e.book)) continue;
    let ok = true;
    for (let i = 0; i < p.terms.length; i++) {
      const hit = res ? res[i].test(e.norm) : e.norm.includes(p.terms[i]);
      if (!hit) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(e);
  }
  return out;
}
