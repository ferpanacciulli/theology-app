import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  ready: boolean; // true una vez que se supo si había sesión guardada o no
  setSession: (s: Session | null) => void;
  setReady: (r: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  ready: !supabase, // sin Supabase configurado no hay nada que esperar
  setSession: (session) => set({ session }),
  setReady: (ready) => set({ ready }),
}));

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setSession(data.session);
    useAuthStore.getState().setReady(true);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });
}
