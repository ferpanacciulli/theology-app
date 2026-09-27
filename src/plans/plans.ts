import { buildPlan } from "./generate";
import type { Reading } from "./generate";

export interface PlanDef {
  id: string;
  name: string;
  description: string;
  days: number;
}

export const PLAN_DEFS: PlanDef[] = [
  { id: "bible-year", name: "La Biblia en un año", description: "Todo el texto, de Génesis a Apocalipsis, repartido en 365 lecturas.", days: 365 },
  { id: "nt-90", name: "Nuevo Testamento en 90 días", description: "De Mateo a Apocalipsis a un ritmo cómodo de tres meses.", days: 90 },
  { id: "psalms-proverbs-30", name: "Salmos y Proverbios en un mes", description: "Salmos y Proverbios completos, un poco cada día durante 30 días.", days: 30 },
];

const RANGES: Record<string, number[]> = {
  "bible-year": Array.from({ length: 66 }, (_, i) => i + 1),
  "nt-90": Array.from({ length: 27 }, (_, i) => i + 40),
  "psalms-proverbs-30": [19, 20],
};

const cache = new Map<string, Reading[][]>();

/** Las lecturas de cada día del plan, calculadas una sola vez. */
export function planReadings(id: string): Reading[][] {
  let r = cache.get(id);
  if (!r) {
    const bookIds = RANGES[id];
    const def = PLAN_DEFS.find((p) => p.id === id);
    if (!bookIds || !def) return [];
    r = buildPlan(bookIds, def.days);
    cache.set(id, r);
  }
  return r;
}
