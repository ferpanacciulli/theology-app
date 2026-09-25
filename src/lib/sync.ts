import { supabase } from "./supabase";
import { useAuthStore } from "../store/useAuthStore";
import { loadJSON, saveJSON } from "../store/localPersist";
import { useStudyStore } from "../store/useStudyStore";
import type { SavedPosition } from "../store/useStudyStore";

/**
 * Sincroniza SOLO configuración liviana: posición de lectura y disposición de
 * paneles (a futuro, notas). Los módulos importados (Biblias, comentarios,
 * diccionarios) NUNCA se suben: son pesados y quedan solo en este dispositivo.
 */

const TABLE = "user_state";
const RELOAD_FLAG = "teologia:reloaded-for-sync";
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let applyingRemote = false;

interface RemoteRow {
  position: Record<string, unknown> | null;
  layout: Record<string, unknown> | null;
}

/** Se llama cada vez que cambia la posición o la disposición de paneles. */
export function scheduleSync() {
  if (!supabase || applyingRemote) return;
  const session = useAuthStore.getState().session;
  if (!session) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 800);
}

async function push() {
  if (!supabase) return;
  const session = useAuthStore.getState().session;
  if (!session) return;
  const position = loadJSON<Record<string, unknown> | null>("position", null);
  const layout = loadJSON<Record<string, unknown> | null>("layout", null);
  await supabase
    .from(TABLE)
    .upsert({ user_id: session.user.id, position, layout, updated_at: new Date().toISOString() });
}

/** Se llama una vez, justo después de iniciar sesión. */
export async function pullAndApply(userId: string) {
  if (!supabase) return;
  const { data, error } = await supabase
    .from(TABLE)
    .select("position, layout")
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as RemoteRow | null;

  if (error || !row) {
    // Primera vez que esta cuenta se usa: sube lo que ya había en este dispositivo.
    await push();
    return;
  }

  applyingRemote = true;
  try {
    if (row.position) {
      saveJSON("position", row.position);
      useStudyStore.getState().applyRemote(row.position as Partial<SavedPosition>);
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
