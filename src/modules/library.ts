import { get, set, del } from "idb-keyval";
import type { ModuleMeta } from "./types";
import { kindFromFilename, openModule, readDetails } from "./esword/reader";

const INDEX_KEY = "modules:index";

// Módulos incluidos con la app: public/modules/manifest.json (lo genera scripts/build-manifest.mjs).
let catalogPromise: Promise<ModuleMeta[]> | null = null;

function catalog(): Promise<ModuleMeta[]> {
  if (!catalogPromise) {
    catalogPromise = fetch("/modules/manifest.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((j) => (Array.isArray(j) ? (j as ModuleMeta[]) : []))
      .catch(() => []);
  }
  return catalogPromise;
}

async function userModules(): Promise<ModuleMeta[]> {
  return (await get<ModuleMeta[]>(INDEX_KEY)) ?? [];
}

export async function listModules(): Promise<ModuleMeta[]> {
  return [...(await catalog()), ...(await userModules())];
}

export async function importModule(file: File): Promise<ModuleMeta> {
  const kind = kindFromFilename(file.name);
  if (!kind) throw new Error(`Tipo de módulo no reconocido: ${file.name}`);

  const data = await file.arrayBuffer();
  const db = await openModule(data); // valida que sea SQLite legible
  const { title, abbreviation } = readDetails(db);
  db.close();

  const meta: ModuleMeta = {
    id: crypto.randomUUID(),
    filename: file.name,
    kind,
    title: title || file.name,
    abbreviation,
  };
  await set(`module:${meta.id}`, data);
  await set(INDEX_KEY, [...(await userModules()), meta]);
  return meta;
}

export async function loadModuleData(id: string): Promise<ArrayBuffer | undefined> {
  const entry = (await catalog()).find((m) => m.id === id);
  if (entry?.url) {
    const cached = await get<ArrayBuffer>(`module:${id}`);
    if (cached && (await get<string>(`ver:${id}`)) === entry.version) return cached;
    const res = await fetch(entry.url);
    if (!res.ok) throw new Error(`No se pudo descargar ${entry.filename}`);
    const buf = await res.arrayBuffer();
    await set(`module:${id}`, buf);
    await set(`ver:${id}`, entry.version ?? "");
    return buf;
  }
  return get<ArrayBuffer>(`module:${id}`);
}

export async function removeModule(id: string): Promise<void> {
  await del(`module:${id}`);
  await set(INDEX_KEY, (await userModules()).filter((m) => m.id !== id));
}
