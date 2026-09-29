import * as FlexLayout from "flexlayout-react";
import type { ModuleMeta } from "../modules/types";
import { loadJSON, saveJSON } from "../store/localPersist";
import { scheduleSync } from "../lib/sync";

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
            children: [{ type: "tab", id: "notes-main", name: "Notas", component: "notes" }],
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
  scheduleSync();
}

/** Abre un módulo importado en una pestaña nueva (Biblias a la izquierda, el resto a la derecha). Si ya estaba abierto, lo vuelve a mostrar en vez de duplicarlo. */
export function openModuleTab(m: ModuleMeta) {
  let found: FlexLayout.TabNode | undefined;
  model.visitNodes((node) => {
    if (!found && node instanceof FlexLayout.TabNode && node.getConfig()?.moduleId === m.id) {
      found = node;
    }
  });
  if (found) {
    showTab(found.getId());
    return;
  }
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

/** Muestra la Biblia incluida (RVR1960), o un módulo de Biblia importado, sin duplicar pestañas. */
export function focusBibleVersion(sourceId: string, modules: ModuleMeta[]) {
  if (!sourceId) {
    showTab("bible-main");
    return;
  }
  const m = modules.find((x) => x.id === sourceId);
  if (m) openModuleTab(m);
}

/** Muestra una pestaña por id (p. ej. "bible-main" o "search-main"). */
export function showTab(id: string) {
  try {
    model.doAction(FlexLayout.Actions.selectTab(id));
  } catch {
    /* la pestaña fue cerrada */
  }
}

/**
 * Abre (o vuelve a mostrar, si ya estaba abierta) una pestaña única de la app
 * (Notas o Plan de lectura), identificada por su `component`. Busca por tipo
 * de contenido, no por id: alguien que ya tenía una disposición guardada de
 * antes de que existiera este id también la encuentra.
 */
function openSingletonTab(component: string, name: string) {
  let found: FlexLayout.TabNode | undefined;
  model.visitNodes((node) => {
    if (!found && node instanceof FlexLayout.TabNode && node.getComponent() === component) {
      found = node;
    }
  });
  if (found) {
    showTab(found.getId());
    return;
  }
  const target = model.getNodeById("side")?.getId() ?? model.getActiveTabset()?.getId();
  if (!target) return;
  model.doAction(
    FlexLayout.Actions.addNode({ type: "tab", name, component }, target, FlexLayout.DockLocation.CENTER, -1)
  );
}

export const openNotesTab = () => openSingletonTab("notes", "Notas");
export const openPlanTab = () => openSingletonTab("plan", "Plan de lectura");
