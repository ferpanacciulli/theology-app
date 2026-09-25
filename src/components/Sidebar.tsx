import { useEffect, useRef, useState } from "react";
import { useStudyStore } from "../store/useStudyStore";
import { importModule, listModules, removeModule } from "../modules/library";
import { dropModuleDb } from "../modules/useModuleDb";
import { openModuleTab } from "./layoutModel";
import { useIsMobile } from "../useIsMobile";
import type { ModuleMeta } from "../modules/types";

function Sidebar() {
  const modules = useStudyStore((s) => s.modules);
  const setModules = useStudyStore((s) => s.setModules);
  const setMobileTab = useStudyStore((s) => s.setMobileTab);
  const isMobile = useIsMobile();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listModules().then(setModules);
  }, [setModules]);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    for (const f of Array.from(files)) {
      try {
        await importModule(f);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setModules(await listModules());
  }

  async function onRemove(id: string) {
    await dropModuleDb(id);
    await removeModule(id);
    setModules(await listModules());
  }

  const item = (m: ModuleMeta) => (
    <div key={m.id} className="flex items-start justify-between gap-2 mb-1 text-sm">
      <button
        onClick={() => (isMobile ? setMobileTab("module", m.id) : openModuleTab(m))}
        className="text-left flex-1 rounded-lg px-2 py-1.5 hover:bg-zinc-800 transition-colors"
        title="Abrir en una pestaña"
      >
        <div className="text-zinc-200">{m.abbreviation || m.title}</div>
        <div className="text-xs text-zinc-500">{m.kind}{m.abbreviation ? ` · ${m.title}` : ""}</div>
      </button>
      {!m.builtin && (
        <button
          onClick={() => onRemove(m.id)}
          className="text-zinc-500 hover:text-red-400 px-1 py-1.5"
          title="Quitar"
        >
          ×
        </button>
      )}
    </div>
  );

  const library = modules.filter((m) => m.builtin);
  const mine = modules.filter((m) => !m.builtin);

  return (
    <div className={`h-full shrink-0 bg-zinc-900 border-r border-zinc-800 p-3 overflow-auto ${isMobile ? "w-full" : "w-64"}`}>
      <button
        onClick={() => input.current?.click()}
        className="w-full bg-sky-700 hover:bg-sky-600 px-3 py-2 rounded-lg mb-2 transition-colors"
      >
        Importar módulos
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept=".bblx,.cmtx,.dctx,.lexx,.refx,.topx,.devx,.notx,.harx,.mapx,.lstx,.bbl,.cmt,.dct,.ref,.top,.dev,.not,.har,.map,.lst"
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      {library.length > 0 && (
        <>
          <h3 className="text-xs uppercase tracking-wide text-zinc-500 mt-4 mb-2 px-2">Biblioteca</h3>
          {library.map(item)}
        </>
      )}
      <h3 className="text-xs uppercase tracking-wide text-zinc-500 mt-4 mb-2 px-2">Mis módulos</h3>
      {mine.length === 0 && <p className="text-sm text-zinc-500 px-2">Ninguno importado todavía.</p>}
      {mine.map(item)}
    </div>
  );
}

export default Sidebar;
