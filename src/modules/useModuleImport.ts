import { useRef, useState } from "react";
import { importModule, listModules, removeModule } from "./library";
import { dropModuleDb } from "./useModuleDb";
import type { ModuleMeta } from "./types";

export const IMPORT_ACCEPT =
  ".bblx,.cmtx,.dctx,.lexx,.refx,.topx,.devx,.notx,.harx,.mapx,.lstx,.bbl,.cmt,.dct,.ref,.top,.dev,.not,.har,.map,.lst";

/** Lógica compartida de importar/quitar módulos, usada por la barra de módulos y por la biblioteca del celular. */
export function useModuleImport(setModules: (m: ModuleMeta[]) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

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

  return { inputRef, error, onFiles, onRemove };
}
