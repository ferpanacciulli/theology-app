import { useEffect, useRef } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { pullAndApply, onSignOut } from "./lib/sync";

/** Al iniciar sesión, trae la posición/disposición guardadas en la nube (si hay). */
export function useAuthSync() {
  const session = useAuthStore((s) => s.session);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user.id ?? null;
    if (userId && userId !== prevUserId.current) {
      pullAndApply(userId);
    }
    if (!userId && prevUserId.current) {
      onSignOut();
    }
    prevUserId.current = userId;
  }, [session]);
}
