export interface VerseRef {
  book: number;
  chapter: number;
  verse: number;
}

// Una selección de versículos conocidos, de aliento o de promesa. Se elige uno
// distinto por día del año (el mismo para todos, como en cualquier app de este tipo).
export const VERSE_OF_THE_DAY_LIST: VerseRef[] = [
  { book: 43, chapter: 3, verse: 16 }, { book: 19, chapter: 23, verse: 1 },
  { book: 50, chapter: 4, verse: 13 }, { book: 23, chapter: 41, verse: 10 },
  { book: 45, chapter: 8, verse: 28 }, { book: 20, chapter: 3, verse: 5 },
  { book: 19, chapter: 46, verse: 1 }, { book: 58, chapter: 11, verse: 1 },
  { book: 24, chapter: 29, verse: 11 }, { book: 46, chapter: 13, verse: 4 },
  { book: 62, chapter: 4, verse: 18 }, { book: 19, chapter: 27, verse: 1 },
  { book: 40, chapter: 11, verse: 28 }, { book: 45, chapter: 12, verse: 2 },
  { book: 49, chapter: 2, verse: 8 }, { book: 6, chapter: 1, verse: 9 },
  { book: 19, chapter: 34, verse: 18 }, { book: 43, chapter: 14, verse: 27 },
  { book: 50, chapter: 4, verse: 6 }, { book: 47, chapter: 5, verse: 7 },
  { book: 19, chapter: 121, verse: 1 }, { book: 48, chapter: 5, verse: 22 },
  { book: 43, chapter: 15, verse: 5 }, { book: 51, chapter: 3, verse: 23 },
  { book: 59, chapter: 1, verse: 5 }, { book: 20, chapter: 16, verse: 3 },
  { book: 19, chapter: 37, verse: 4 }, { book: 43, chapter: 1, verse: 12 },
  { book: 45, chapter: 5, verse: 8 }, { book: 46, chapter: 10, verse: 13 },
  { book: 19, chapter: 91, verse: 1 }, { book: 43, chapter: 8, verse: 32 },
  { book: 60, chapter: 5, verse: 7 }, { book: 20, chapter: 18, verse: 10 },
  { book: 43, chapter: 10, verse: 10 }, { book: 45, chapter: 15, verse: 13 },
  { book: 19, chapter: 62, verse: 1 }, { book: 66, chapter: 21, verse: 4 },
  { book: 23, chapter: 40, verse: 31 }, { book: 51, chapter: 3, verse: 2 },
];

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

export function verseOfTheDay(date: Date = new Date()): VerseRef {
  const i = dayOfYear(date) % VERSE_OF_THE_DAY_LIST.length;
  return VERSE_OF_THE_DAY_LIST[i];
}
