import { books } from "../bible/books";
import { chaptersByBook } from "../bible/chapters";

export interface Reading {
  book: number;
  chapter: number;
}

/** Todos los capítulos de los libros indicados, en orden canónico. */
function flattenChapters(bookIds: number[]): Reading[] {
  const set = new Set(bookIds);
  const out: Reading[] = [];
  for (const b of books) {
    if (!set.has(b.id)) continue;
    const n = chaptersByBook[b.id] ?? 0;
    for (let c = 1; c <= n; c++) out.push({ book: b.id, chapter: c });
  }
  return out;
}

/**
 * Reparte los capítulos de esos libros en `days` lecturas lo más parejas
 * posible (algunos días tienen un capítulo más que otros, nunca de menos).
 */
export function buildPlan(bookIds: number[], days: number): Reading[][] {
  const chapters = flattenChapters(bookIds);
  const base = Math.floor(chapters.length / days);
  const extra = chapters.length % days; // los primeros `extra` días llevan uno más
  const out: Reading[][] = [];
  let i = 0;
  for (let d = 0; d < days; d++) {
    const size = base + (d < extra ? 1 : 0);
    out.push(chapters.slice(i, i + size));
    i += size;
  }
  return out;
}

/** "Génesis 1-3" o "Génesis 1; Éxodo 1-2" para mostrar la lectura de un día. */
export function formatReadings(readings: Reading[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < readings.length) {
    let j = i;
    while (
      j + 1 < readings.length &&
      readings[j + 1].book === readings[i].book &&
      readings[j + 1].chapter === readings[j].chapter + 1
    ) {
      j++;
    }
    const name = books.find((b) => b.id === readings[i].book)?.name ?? "";
    parts.push(
      j === i ? `${name} ${readings[i].chapter}` : `${name} ${readings[i].chapter}-${readings[j].chapter}`
    );
    i = j + 1;
  }
  return parts.join("; ");
}
