import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

// Si no se configuraron las variables de entorno, la app sigue funcionando
// igual que antes: todo queda en el dispositivo, sin cuentas.
export const supabase = isSupabaseConfigured ? createClient(url!, key!) : null;
