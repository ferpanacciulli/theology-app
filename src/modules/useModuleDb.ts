import { useEffect, useState } from "react";
import type { Database } from "sql.js";
import { loadModuleData } from "./library";
import { openModule } from "./esword/reader";

const cache = new Map<string, Promise<Database>>();

export function getModuleDb(id: string): Promise<Database> {
  let p = cache.get(id);
  if (!p) {
    p = loadModuleData(id).then((data) => {
      if (!data) throw new Error("Módulo no encontrado");
      return openModule(data);
    });
    cache.set(id, p);
  }
  return p;
}

export async function dropModuleDb(id: string): Promise<void> {
  const p = cache.get(id);
  cache.delete(id);
  if (p) (await p.catch(() => null))?.close();
}

interface State {
  id?: string;
  db: Database | null;
  error: string;
}

export function useModuleDb(id?: string): { db: Database | null; error: string } {
  const [state, setState] = useState<State>({ db: null, error: "" });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getModuleDb(id)
      .then((db) => !cancelled && setState({ id, db, error: "" }))
      .catch(
        (e) =>
          !cancelled &&
          setState({ id, db: null, error: e instanceof Error ? e.message : String(e) })
      );
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state.id === id ? { db: state.db, error: state.error } : { db: null, error: "" };
}
