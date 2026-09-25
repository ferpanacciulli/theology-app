export type ModuleKind =
  | "bible"
  | "commentary"
  | "dictionary"
  | "reference"
  | "topic"
  | "devotional"
  | "notes"
  | "harmony"
  | "map"
  | "list";

export interface ModuleMeta {
  id: string;
  filename: string;
  kind: ModuleKind;
  title: string;
  abbreviation: string;
  /** Módulo incluido con la app (disponible para todos). */
  builtin?: boolean;
  url?: string;
  version?: string;
}
