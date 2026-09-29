import { create } from "zustand";
import type { ModuleMeta } from "../modules/types";
import { loadJSON, saveJSON } from "./localPersist";
import { scheduleSync } from "../lib/sync";

export type MobileTab = "bible" | "search" | "commentary" | "library" | "notes" | "plan" | "module";

export interface SavedPosition {
  book: number;
  chapter: number;
  verse: number;
  mobileTab: MobileTab;
  mobileModuleId: string;
  bibleSource: string;
  commentarySource: string;
}

const saved = loadJSON<SavedPosition>("position", {
  book: 1,
  chapter: 1,
  verse: 1,
  mobileTab: "bible",
  mobileModuleId: "",
  bibleSource: "",
  commentarySource: "",
});

interface StudyState {
  book: number;
  chapter: number;
  verse: number;
  /** Versículos seleccionados del capítulo actual (para compartir y escuchar). */
  selection: number[];
  /** Versión de la última Biblia que la persona eligió o tocó (la que se comparte y se escucha). */
  activeSource: string;
  /** Versículo que se está leyendo en voz alta ahora mismo, si hay lectura en curso. */
  speakingVerse: number | null;
  /** Pedido de búsqueda de texto desde la barra de arriba (n cambia en cada pedido). */
  searchRequest: { q: string; n: number };
  modules: ModuleMeta[];
  lookup: string;
  mobileTab: MobileTab;
  mobileModuleId: string;
  /** Última versión/comentario elegido en la vista de un solo panel (celular). */
  bibleSource: string;
  commentarySource: string;
  searchFocus: number;
  setReference: (r: { book: number; chapter: number; verse?: number }) => void;
  /** Mueve el marcador de lectura sin tocar la selección (lo usa la lectura en voz alta). */
  setCurrentVerse: (verse: number) => void;
  /** Reemplaza la selección completa (la usa la selección de texto con el mouse/dedo). */
  setSelection: (verses: number[]) => void;
  setActiveSource: (id: string) => void;
  setSpeakingVerse: (v: number | null) => void;
  requestSearch: (q: string) => void;
  setModules: (m: ModuleMeta[]) => void;
  setLookup: (code: string) => void;
  setMobileTab: (tab: MobileTab, moduleId?: string) => void;
  setBibleSource: (id: string) => void;
  setCommentarySource: (id: string) => void;
  focusSearch: () => void;
  /** Aplica una posición traída de otro dispositivo (Supabase), sin volver a subirla. */
  applyRemote: (p: Partial<SavedPosition>) => void;
}

export const useStudyStore = create<StudyState>((set, get) => {
  function persist(sync = true) {
    const s = get();
    saveJSON("position", {
      book: s.book,
      chapter: s.chapter,
      verse: s.verse,
      mobileTab: s.mobileTab,
      mobileModuleId: s.mobileModuleId,
      bibleSource: s.bibleSource,
      commentarySource: s.commentarySource,
    });
    if (sync) scheduleSync();
  }

  return {
    book: saved.book,
    chapter: saved.chapter,
    verse: saved.verse,
    selection: [saved.verse],
    activeSource: saved.bibleSource,
    speakingVerse: null,
    searchRequest: { q: "", n: 0 },
    modules: [],
    lookup: "",
    mobileTab: saved.mobileTab,
    mobileModuleId: saved.mobileModuleId,
    bibleSource: saved.bibleSource,
    commentarySource: saved.commentarySource,
    searchFocus: 0,
    setReference: ({ book, chapter, verse }) => {
      const v = verse ?? 1;
      set({ book, chapter, verse: v, selection: [v] });
      persist();
    },
    setCurrentVerse: (verse) => {
      set({ verse });
      persist();
    },
    setSelection: (verses) => {
      const sorted = [...new Set(verses)].sort((a, b) => a - b);
      if (!sorted.length) return;
      set({ selection: sorted, verse: sorted[sorted.length - 1] });
      persist();
    },
    setActiveSource: (activeSource) => set({ activeSource }),
    setSpeakingVerse: (speakingVerse) => set({ speakingVerse }),
    requestSearch: (q) => set((s) => ({ searchRequest: { q, n: s.searchRequest.n + 1 } })),
    setModules: (modules) => set({ modules }),
    setLookup: (lookup) => set({ lookup }),
    setMobileTab: (mobileTab, moduleId) => {
      set((s) => ({ mobileTab, mobileModuleId: moduleId ?? s.mobileModuleId }));
      persist();
    },
    setBibleSource: (bibleSource) => {
      set({ bibleSource, activeSource: bibleSource });
      persist();
    },
    setCommentarySource: (commentarySource) => {
      set({ commentarySource });
      persist();
    },
    focusSearch: () => set((s) => ({ searchFocus: s.searchFocus + 1 })),
    applyRemote: (p) => {
      set({
        book: p.book ?? get().book,
        chapter: p.chapter ?? get().chapter,
        verse: p.verse ?? get().verse,
        selection: [p.verse ?? get().verse],
        mobileTab: p.mobileTab ?? get().mobileTab,
        mobileModuleId: p.mobileModuleId ?? get().mobileModuleId,
        bibleSource: p.bibleSource ?? get().bibleSource,
        commentarySource: p.commentarySource ?? get().commentarySource,
      });
      persist(false);
    },
  };
});
