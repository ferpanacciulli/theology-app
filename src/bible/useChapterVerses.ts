import { useEffect, useMemo, useState } from "react";
import type { Database } from "sql.js";
import { useModuleDb } from "../modules/useModuleDb";
import { getChapterVerses, isEncrypted } from "../modules/esword/reader";
import { loadRVR60 } from "./rvr60";
import type { BibleIndex } from "./rvr60";

export interface ChapterVerse {
  Verse: number;
  Scripture: string;
}

/**
 * Los versículos de un capítulo en la versión indicada ("" = RVR1960 incluida,
 * o el id de un módulo importado). Lo usan la Biblia y la barra de arriba.
 */
export function useChapterVerses(source: string, book: number, chapter: number) {
  const { db, error } = useModuleDb(source || undefined);
  const [index, setIndex] = useState<BibleIndex | null>(null);
  const encrypted = useMemo(() => (db ? isEncrypted(db) : false), [db]);

  useEffect(() => {
    loadRVR60().then(setIndex);
  }, []);

  const verses = useMemo<ChapterVerse[]>(() => {
    if (source) return db && !encrypted ? getChapterVerses(db, book, chapter) : [];
    return (index?.get(`${book}:${chapter}`) ?? []).map((v) => ({
      Verse: v.Verse,
      Scripture: v.Scripture,
    }));
  }, [source, db, encrypted, index, book, chapter]);

  const loading = source ? !db && !error : !index;
  return { verses, db: db as Database | null, error, encrypted, loading };
}
