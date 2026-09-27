import { useMemo } from "react";
import { PLAN_DEFS, planReadings } from "../plans/plans";
import { formatReadings } from "../plans/generate";
import { usePlanStore } from "../store/usePlanStore";
import { useStudyStore } from "../store/useStudyStore";
import { useIsMobile } from "../useIsMobile";
import { showTab } from "./layoutModel";

function PlansView() {
  const { activePlanId, progress, start, advance, switchTo } = usePlanStore();
  const setReference = useStudyStore((s) => s.setReference);
  const setMobileTab = useStudyStore((s) => s.setMobileTab);
  const isMobile = useIsMobile();

  const activeDef = PLAN_DEFS.find((p) => p.id === activePlanId);
  const readings = useMemo(() => (activePlanId ? planReadings(activePlanId) : []), [activePlanId]);
  const currentDay = activePlanId ? progress[activePlanId]?.currentDay ?? 1 : 1;
  const done = activeDef ? currentDay > activeDef.days : false;
  const todayReadings = !done ? readings[currentDay - 1] ?? [] : [];

  function goToFirst() {
    const r = todayReadings[0];
    if (!r) return;
    setReference({ book: r.book, chapter: r.chapter });
    if (isMobile) setMobileTab("bible");
    else showTab("bible-main");
  }

  if (!activeDef) {
    return (
      <div className="h-full overflow-auto bg-zinc-900 text-zinc-200 p-4 md:p-6">
        <h1 className="font-serif text-2xl font-bold mb-4">Planes de lectura</h1>
        <div className="space-y-3 max-w-xl">
          {PLAN_DEFS.map((p) => {
            const prog = progress[p.id];
            return (
              <div key={p.id} className="rounded-xl bg-zinc-800/60 p-4">
                <h2 className="font-bold mb-1">{p.name}</h2>
                <p className="text-sm text-zinc-400 mb-3">{p.description}</p>
                <button
                  onClick={() => start(p.id)}
                  className="bg-sky-700 hover:bg-sky-600 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {prog ? `Continuar (día ${prog.currentDay} de ${p.days})` : "Empezar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-zinc-900 text-zinc-200 p-4 md:p-6">
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="font-serif text-2xl font-bold">{activeDef.name}</h1>
        <button onClick={() => switchTo(null)} className="text-sm text-sky-400 hover:underline">
          Ver otros planes
        </button>
      </div>

      <div className="h-2 bg-zinc-800 rounded-full mt-3 mb-2 max-w-md overflow-hidden">
        <div
          className="h-full bg-sky-600 transition-all"
          style={{ width: `${Math.min(100, ((currentDay - 1) / activeDef.days) * 100)}%` }}
        />
      </div>
      <p className="text-sm text-zinc-500 mb-6">
        {done ? "¡Plan completado!" : `Día ${currentDay} de ${activeDef.days}`}
      </p>

      {done ? (
        <div className="max-w-md">
          <p className="mb-4">Terminaste "{activeDef.name}". 🎉</p>
          <button
            onClick={() => start(activeDef.id)}
            className="bg-sky-700 hover:bg-sky-600 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Volver a empezar
          </button>
        </div>
      ) : (
        <div className="max-w-md rounded-xl bg-zinc-800/60 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Lectura de hoy</p>
          <p className="font-serif text-lg mb-4">{formatReadings(todayReadings)}</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={goToFirst} className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm transition-colors">
              Leer ahora
            </button>
            <button
              onClick={() => advance(activeDef.id, activeDef.days)}
              className="bg-sky-700 hover:bg-sky-600 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Marcar como leído
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlansView;
