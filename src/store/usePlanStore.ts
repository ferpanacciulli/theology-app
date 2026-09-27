import { create } from "zustand";
import { loadJSON, saveJSON } from "./localPersist";
import { scheduleSync } from "../lib/sync";

interface PlanProgress {
  currentDay: number; // 1-indexado
}

interface SavedPlans {
  activePlanId: string | null;
  progress: Record<string, PlanProgress>;
}

const saved = loadJSON<SavedPlans>("plans", { activePlanId: null, progress: {} });

interface PlanState extends SavedPlans {
  start: (planId: string) => void;
  advance: (planId: string, totalDays: number) => void;
  switchTo: (planId: string | null) => void;
  applyRemote: (p: SavedPlans) => void;
}

export const usePlanStore = create<PlanState>((set, get) => {
  function persist(sync = true) {
    const s = get();
    saveJSON("plans", { activePlanId: s.activePlanId, progress: s.progress });
    if (sync) scheduleSync();
  }

  return {
    activePlanId: saved.activePlanId,
    progress: saved.progress,
    start: (planId) => {
      set((s) => ({
        activePlanId: planId,
        progress: { ...s.progress, [planId]: s.progress[planId] ?? { currentDay: 1 } },
      }));
      persist();
    },
    advance: (planId, totalDays) => {
      set((s) => {
        const day = s.progress[planId]?.currentDay ?? 1;
        return { progress: { ...s.progress, [planId]: { currentDay: Math.min(day + 1, totalDays + 1) } } };
      });
      persist();
    },
    switchTo: (activePlanId) => {
      set({ activePlanId });
      persist();
    },
    applyRemote: (p) => {
      set({ activePlanId: p.activePlanId, progress: p.progress });
      persist(false);
    },
  };
});
