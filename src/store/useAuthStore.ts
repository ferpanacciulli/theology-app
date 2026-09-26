import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  ready: boolean; // true una vez que se supo si había sesión guardada o no
  /** true justo después de tocar el enlace de "olvidé mi contraseña" del correo. */
  recovery: boolean;
  setSession: (s: Session | null) => void;
  setReady: (r: boolean) => void;
  setRecovery: (r: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  ready: !supabase, // sin Supabase configurado no hay nada que esperar
  recovery: false,
  setSession: (session) => set({ session }),
  setReady: (ready) => set({ ready }),
  setRecovery: (recovery) => set({ recovery }),
}));

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setSession(data.session);
    useAuthStore.getState().setReady(true);
  });
  supabase.auth.onAuthStateChange((event, session) => {
    useAuthStore.getState().setSession(session);
    if (event === "PASSWORD_RECOVERY") useAuthStore.getState().setRecovery(true);
  });
}
