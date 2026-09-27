import { create } from "zustand";
import type { HighlightEntry, HighlightMap } from "../notes/localHighlights";
import { loadHighlights, saveHighlights, verseKey } from "../notes/localHighlights";
import { HIGHLIGHT_COLORS } from "../notes/colors";
import type { ColorKey } from "../notes/colors";
import { loadJSON, saveJSON } from "./localPersist";
import { pushHighlight, scheduleColorLabelsSync } from "../lib/sync";
import { useAuthStore } from "./useAuthStore";

interface HighlightState {
  entries: HighlightMap;
  colorLabels: Record<string, string>;
  loaded: boolean;
  init: () => Promise<void>;
  labelFor: (key: string) => string;
  setHighlight: (book: number, chapter: number, verse: number, color: ColorKey | null, note: string | null) => void;
  setColorLabel: (key: string, label: string) => void;
  /** Aplica lo traído de la nube al iniciar sesión, sin volver a subirlo. */
  mergeRemote: (rows: { book: number; chapter: number; verse: number; color: string | null; note: string | null; updated_at: string }[]) => void;
}

export const useHighlightStore = create<HighlightState>((set, get) => ({
  entries: {},
  colorLabels: loadJSON<Record<string, string>>("colorLabels", {}),
  loaded: false,

  init: async () => {
    if (get().loaded) return;
    const entries = await loadHighlights();
    set({ entries, loaded: true });
  },

  labelFor: (key) => get().colorLabels[key] ?? HIGHLIGHT_COLORS.find((c) => c.key === key)?.defaultLabel ?? key,

  setHighlight: (book, chapter, verse, color, note) => {
    const key = verseKey(book, chapter, verse);
    const entries = { ...get().entries };
    if (!color && !note) {
      delete entries[key];
    } else {
      entries[key] = { book, chapter, verse, color, note, updatedAt: new Date().toISOString() };
    }
    set({ entries });
    saveHighlights(entries);
    const session = useAuthStore.getState().session;
    if (session) pushHighlight(session.user.id, { book, chapter, verse }, entries[key] ?? null);
  },

  setColorLabel: (key, label) => {
    const colorLabels = { ...get().colorLabels, [key]: label };
    set({ colorLabels });
    saveJSON("colorLabels", colorLabels);
    scheduleColorLabelsSync();
  },

  mergeRemote: (rows) => {
    const entries = { ...get().entries };
    const session = useAuthStore.getState().session;
    for (const r of rows) {
      const key = verseKey(r.book, r.chapter, r.verse);
      const local = entries[key];
      const remoteEntry: HighlightEntry = {
        book: r.book, chapter: r.chapter, verse: r.verse,
        color: (r.color as ColorKey) ?? null, note: r.note, updatedAt: r.updated_at,
      };
      if (!local) {
        entries[key] = remoteEntry;
      } else if (new Date(r.updated_at) > new Date(local.updatedAt)) {
        entries[key] = remoteEntry;
      } else if (new Date(local.updatedAt) > new Date(r.updated_at) && session) {
        // Lo local es más nuevo (se editó sin conexión): se vuelve a subir.
        pushHighlight(session.user.id, local, local);
      }
    }
    // Entradas que existen solo localmente (nunca subidas) también se suben.
    if (session) {
      const remoteKeys = new Set(rows.map((r) => verseKey(r.book, r.chapter, r.verse)));
      for (const [key, local] of Object.entries(entries)) {
        if (!remoteKeys.has(key)) pushHighlight(session.user.id, local, local);
      }
    }
    set({ entries });
    saveHighlights(entries);
  },
}));
