export interface Verse {
  Book: number;
  Chapter: number;
  Verse: number;
  Scripture: string;
}

export type BibleIndex = Map<string, Verse[]>;

let cache: Promise<BibleIndex> | null = null;

// Se carga en un chunk aparte, no en el bundle principal.
export function loadRVR60(): Promise<BibleIndex> {
  if (!cache) {
    cache = import("../data/RVR60.json").then((mod) => {
      const idx: BibleIndex = new Map();
      for (const v of (mod.default as { verses: Verse[] }).verses) {
        const key = `${v.Book}:${v.Chapter}`;
        const list = idx.get(key);
        if (list) list.push(v);
        else idx.set(key, [v]);
      }
      return idx;
    });
  }
  return cache;
}

export async function getRVR60Verse(book: number, chapter: number, verse: number): Promise<string | null> {
  const idx = await loadRVR60();
  const list = idx.get(`${book}:${chapter}`);
  return list?.find((v) => v.Verse === verse)?.Scripture ?? null;
}
