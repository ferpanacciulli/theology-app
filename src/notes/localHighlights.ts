import { get, set } from "idb-keyval";
import type { ColorKey } from "./colors";

export interface HighlightEntry {
  book: number;
  chapter: number;
  verse: number;
  color: ColorKey | null;
  note: string | null;
  updatedAt: string; // ISO
}

export type HighlightMap = Record<string, HighlightEntry>; // clave: "book:chapter:verse"

const KEY = "highlights:index";

export function verseKey(book: number, chapter: number, verse: number): string {
  return `${book}:${chapter}:${verse}`;
}

export async function loadHighlights(): Promise<HighlightMap> {
  return (await get<HighlightMap>(KEY)) ?? {};
}

export async function saveHighlights(map: HighlightMap): Promise<void> {
  await set(KEY, map);
}
