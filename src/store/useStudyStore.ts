import { create } from "zustand";
import type { ModuleMeta } from "../modules/types";
import { loadJSON, saveJSON } from "./localPersist";

export type MobileTab = "bible" | "search" | "commentary" | "library" | "notes" | "module";

interface SavedPosition {
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
  modules: ModuleMeta[];
  lookup: string;
  mobileTab: MobileTab;
  mobileModuleId: string;
  /** Última versión/comentario elegido en la vista de un solo panel (celular). */
  bibleSource: string;
  commentarySource: string;
  searchFocus: number;
  setReference: (r: { book: number; chapter: number; verse?: number }) => void;
  setModules: (m: ModuleMeta[]) => void;
  setLookup: (code: string) => void;
  setMobileTab: (tab: MobileTab, moduleId?: string) => void;
  setBibleSource: (id: string) => void;
  setCommentarySource: (id: string) => void;
  focusSearch: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => {
  function persist() {
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
  }

  return {
    book: saved.book,
    chapter: saved.chapter,
    verse: saved.verse,
    modules: [],
    lookup: "",
    mobileTab: saved.mobileTab,
    mobileModuleId: saved.mobileModuleId,
    bibleSource: saved.bibleSource,
    commentarySource: saved.commentarySource,
    searchFocus: 0,
    setReference: ({ book, chapter, verse }) => {
      set({ book, chapter, verse: verse ?? 1 });
      persist();
    },
    setModules: (modules) => set({ modules }),
    setLookup: (lookup) => set({ lookup }),
    setMobileTab: (mobileTab, moduleId) => {
      set((s) => ({ mobileTab, mobileModuleId: moduleId ?? s.mobileModuleId }));
      persist();
    },
    setBibleSource: (bibleSource) => {
      set({ bibleSource });
      persist();
    },
    setCommentarySource: (commentarySource) => {
      set({ commentarySource });
      persist();
    },
    focusSearch: () => set((s) => ({ searchFocus: s.searchFocus + 1 })),
  };
});
