import { create } from "zustand";
import type { ModuleMeta } from "../modules/types";

export type MobileTab = "bible" | "search" | "commentary" | "library" | "notes" | "module";

interface StudyState {
  book: number;
  chapter: number;
  verse: number;
  modules: ModuleMeta[];
  lookup: string;
  mobileTab: MobileTab;
  mobileModuleId: string;
  searchFocus: number;
  setReference: (r: { book: number; chapter: number; verse?: number }) => void;
  setModules: (m: ModuleMeta[]) => void;
  setLookup: (code: string) => void;
  setMobileTab: (tab: MobileTab, moduleId?: string) => void;
  focusSearch: () => void;
}

export const useStudyStore = create<StudyState>((set) => ({
  book: 1,
  chapter: 1,
  verse: 1,
  modules: [],
  lookup: "",
  mobileTab: "bible",
  mobileModuleId: "",
  searchFocus: 0,
  setReference: ({ book, chapter, verse }) =>
    set({ book, chapter, verse: verse ?? 1 }),
  setModules: (modules) => set({ modules }),
  setLookup: (lookup) => set({ lookup }),
  setMobileTab: (mobileTab, moduleId) =>
    set((s) => ({ mobileTab, mobileModuleId: moduleId ?? s.mobileModuleId })),
  focusSearch: () => set((s) => ({ searchFocus: s.searchFocus + 1 })),
}));
