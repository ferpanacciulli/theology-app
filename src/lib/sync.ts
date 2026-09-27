import { supabase } from "./supabase";
import { useAuthStore } from "../store/useAuthStore";
import { loadJSON, saveJSON } from "../store/localPersist";
import { useStudyStore } from "../store/useStudyStore";
import type { SavedPosition } from "../store/useStudyStore";

/**
 * Sincroniza configuración liviana (posición de lectura, disposición de
 * paneles, nombres de colores) y los subrayados/notas por versículo. Los
 * módulos importados (Biblias, comentarios, diccionarios) NUNCA se suben:
 * son pesados y quedan solo en este dispositivo.
 */

const STATE_TABLE = "user_state";
const HIGHLIGHTS_TABLE = "highlights";
const RELOAD_FLAG = "teologia:reloaded-for-sync";
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let applyingRemote = false;

interface RemoteRow {
  position: Record<string, unknown> | null;
  layout: Record<string, unknown> | null;
  color_labels: Record<string, string> | null;
}

/** Se llama cada vez que cambia la posición o la disposición de paneles. */
export function scheduleSync() {
  if (!supabase || applyingRemote) return;
  const session = useAuthStore.getState().session;
  if (!session) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushState, 800);
}

/** Igual, pero para cuando solo cambió el nombre de un color (mismo destino). */
export const scheduleColorLabelsSync = scheduleSync;

async function pushState() {
  if (!supabase) return;
  const session = useAuthStore.getState().session;
  if (!session) return;
  const position = loadJSON<Record<string, unknown> | null>("position", null);
  const layout = loadJSON<Record<string, unknown> | null>("layout", null);
  const color_labels = loadJSON<Record<string, string>>("colorLabels", {});
  await supabase.from(STATE_TABLE).upsert({
    user_id: session.user.id,
    position,
    layout,
    color_labels,
    updated_at: new Date().toISOString(),
  });
}

/** Sube o borra el subrayado/nota de un solo versículo. */
export async function pushHighlight(
  userId: string,
  key: { book: number; chapter: number; verse: number },
  entry: { color: string | null; note: string | null; updatedAt: string } | null
) {
  if (!supabase) return;
  if (!entry || (!entry.color && !entry.note)) {
    await supabase
      .from(HIGHLIGHTS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("book", key.book)
      .eq("chapter", key.chapter)
      .eq("verse", key.verse);
    return;
  }
  await supabase.from(HIGHLIGHTS_TABLE).upsert(
    {
      user_id: userId,
      book: key.book,
      chapter: key.chapter,
      verse: key.verse,
      color: entry.color,
      note: entry.note,
      updated_at: entry.updatedAt,
    },
    { onConflict: "user_id,book,chapter,verse" }
  );
}

async function pullHighlights(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(HIGHLIGHTS_TABLE)
    .select("book, chapter, verse, color, note, updated_at")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data as {
    book: number; chapter: number; verse: number;
    color: string | null; note: string | null; updated_at: string;
  }[];
}

/** Se llama una vez, justo después de iniciar sesión. */
export async function pullAndApply(userId: string) {
  if (!supabase) return;

  // Subrayados y notas: se mezclan por versículo (gana el más reciente).
  const rows = await pullHighlights(userId);
  const { useHighlightStore } = await import("../store/useHighlightStore");
  useHighlightStore.getState().mergeRemote(rows);

  const { data, error } = await supabase
    .from(STATE_TABLE)
    .select("position, layout, color_labels")
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as RemoteRow | null;

  if (error || !row) {
    // Primera vez que esta cuenta se usa: sube lo que ya había en este dispositivo.
    await pushState();
    return;
  }

  applyingRemote = true;
  try {
    if (row.position) {
      saveJSON("position", row.position);
      useStudyStore.getState().applyRemote(row.position as Partial<SavedPosition>);
    }
    if (row.color_labels) {
      saveJSON("colorLabels", row.color_labels);
      useHighlightStore.setState({ colorLabels: row.color_labels });
    }
    if (row.layout) {
      const current = JSON.stringify(loadJSON("layout", null));
      const incoming = JSON.stringify(row.layout);
      if (current !== incoming) {
        saveJSON("layout", row.layout);
        // La disposición de paneles (flexlayout) no se puede reemplazar en caliente
        // de forma confiable, así que se recarga una sola vez para aplicarla.
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
          return;
        }
      }
    }
  } finally {
    applyingRemote = false;
  }
}

export function onSignOut() {
  sessionStorage.removeItem(RELOAD_FLAG);
}
