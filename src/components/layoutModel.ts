import * as FlexLayout from "flexlayout-react";
import type { ModuleMeta } from "../modules/types";
import { loadJSON, saveJSON } from "../store/localPersist";

const defaultJson = {
  global: {},
  borders: [],
  layout: {
    type: "row",
    children: [
      {
        type: "tabset",
        id: "main",
        weight: 70,
        children: [
          { type: "tab", id: "bible-main", name: "RVR1960", component: "bible" },
          { type: "tab", id: "search-main", name: "Buscar", component: "search" },
        ],
      },
      {
        type: "column",
        weight: 30,
        children: [
          {
            type: "tabset",
            id: "side",
            children: [{ type: "tab", name: "Comentarios", component: "commentary" }],
          },
          {
            type: "tabset",
            children: [{ type: "tab", name: "Notas", component: "notes" }],
          },
        ],
      },
    ],
  },
};

// Se restaura la disposición de paneles y las pestañas abiertas de la última visita.
function loadModel(): FlexLayout.Model {
  const savedJson = loadJSON<typeof defaultJson | null>("layout", null);
  if (savedJson) {
    try {
      return FlexLayout.Model.fromJson(savedJson);
    } catch {
      /* la disposición guardada quedó inválida (versión anterior, etc.) */
    }
  }
  return FlexLayout.Model.fromJson(defaultJson);
}

export const model = loadModel();

export function persistModel(m: FlexLayout.Model) {
  saveJSON("layout", m.toJson());
}

/** Abre un módulo importado en una pestaña nueva (Biblias a la izquierda, el resto a la derecha). */
export function openModuleTab(m: ModuleMeta) {
  const preferred = m.kind === "bible" ? "main" : "side";
  const target =
    model.getNodeById(preferred)?.getId() ?? model.getActiveTabset()?.getId();
  if (!target) return;
  model.doAction(
    FlexLayout.Actions.addNode(
      {
        type: "tab",
        name: m.abbreviation || m.title,
        component: "module",
        config: { moduleId: m.id },
      },
      target,
      FlexLayout.DockLocation.CENTER,
      -1
    )
  );
}

/** Muestra una pestaña por id (p. ej. "bible-main" o "search-main"). */
export function showTab(id: string) {
  try {
    model.doAction(FlexLayout.Actions.selectTab(id));
  } catch {
    /* la pestaña fue cerrada */
  }
}
