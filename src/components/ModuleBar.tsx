import { useEffect, useRef, useState } from "react";
import { useStudyStore } from "../store/useStudyStore";
import { listModules } from "../modules/library";
import { useModuleImport, IMPORT_ACCEPT } from "../modules/useModuleImport";
import { openModuleTab, showTab } from "./layoutModel";
import type { ModuleKind } from "../modules/types";

const LABEL: Record<ModuleKind, string> = {
  bible: "Biblias",
  commentary: "Comentarios",
  dictionary: "Diccionarios",
  reference: "Referencias",
  topic: "Temas",
  devotional: "Devocionales",
  harmony: "Armonías",
  map: "Mapas",
  list: "Listas",
  notes: "Notas (módulos)",
};

const KIND_ORDER: ModuleKind[] = [
  "bible", "commentary", "dictionary", "reference",
  "topic", "devotional", "harmony", "map", "list", "notes",
];

function ModuleBar() {
  const modules = useStudyStore((s) => s.modules);
  const setModules = useStudyStore((s) => s.setModules);
  const { inputRef, error, onFiles, onRemove } = useModuleImport(setModules);
  const [openKind, setOpenKind] = useState<ModuleKind | "">("");
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listModules().then(setModules);
  }, [setModules]);

  useEffect(() => {
    if (!openKind) return;
    const onClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenKind("");
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openKind]);

  const kinds = KIND_ORDER.filter((k) => k === "bible" || modules.some((m) => m.kind === k));
  const items = modules.filter((m) => m.kind === openKind);

  const chip = "px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors flex items-center gap-2";

  return (
    <div ref={barRef} className="border-b border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setOpenKind(openKind === k ? "" : k)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              openKind === k ? "bg-sky-700" : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            {LABEL[k]} ▾
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 transition-colors whitespace-nowrap"
        >
          + Importar
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={IMPORT_ACCEPT}
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {error && <p className="px-3 pb-2 text-red-400 text-sm">{error}</p>}

      {openKind && (
        <div className="px-3 pb-3 pt-1 flex flex-wrap gap-2 border-t border-zinc-800">
          {openKind === "bible" && (
            <button onClick={() => { showTab("bible-main"); setOpenKind(""); }} className={chip}>
              RVR1960 <span className="text-zinc-500">incluida</span>
            </button>
          )}
          {items.map((m) => (
            <span key={m.id} className={chip}>
              <button onClick={() => { openModuleTab(m); setOpenKind(""); }} title={m.title}>
                {m.abbreviation || m.title}
                {m.builtin && <span className="text-zinc-500 ml-1">biblioteca</span>}
              </button>
              {!m.builtin && (
                <button onClick={() => onRemove(m.id)} className="text-zinc-500 hover:text-red-400" title="Quitar">
                  ×
                </button>
              )}
            </span>
          ))}
          {items.length === 0 && openKind !== "bible" && (
            <p className="text-zinc-500 text-sm py-1.5">Ninguno todavía. Importalo con "+ Importar".</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ModuleBar;
