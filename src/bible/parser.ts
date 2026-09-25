import { bookAliases } from "./aliases";

const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Alias sin tildes ni puntos: "génesis", "Genesis" y "gén." dan el mismo libro.
const normalizedAliases: Record<string, number> = {};
for (const [key, id] of Object.entries(bookAliases)) normalizedAliases[strip(key)] = id;

/** "Jn 3:16", "1 Juan 4:8", "1jn 4", "Gén 1:1-3" -> { book, chapter, verse } */
export function parseReference(reference: string) {
  const match = reference.trim().match(/^(.+?)\s*(\d+)(?::(\d+)(?:\s*-\s*\d+)?)?$/);
  if (!match) return null;

  const book = normalizedAliases[strip(match[1])];
  if (!book) return null;

  return {
    book,
    chapter: Number(match[2]),
    verse: match[3] ? Number(match[3]) : null,
  };
}
