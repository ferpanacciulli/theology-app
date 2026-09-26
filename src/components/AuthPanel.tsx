import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

type Mode = "signin" | "signup" | "forgot";

function AuthPanel() {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const recovery = useAuthStore((s) => s.recovery);
  const setRecovery = useAuthStore((s) => s.setRecovery);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const showPanel = open || recovery;

  useEffect(() => {
    if (!showPanel) return;
    const onClick = (e: MouseEvent) => {
      if (recovery) return; // no se puede cerrar sin elegir la contraseña nueva
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showPanel, recovery]);

  function reset() {
    setStatus("idle");
    setMessage("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setStatus("sending");
    setMessage("");

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
      } else {
        setStatus("sent");
        setMessage("Te mandamos un correo con un enlace para elegir una contraseña nueva.");
      }
      return;
    }

    const action =
      mode === "signup"
        ? supabase.auth.signUp({ email: email.trim(), password })
        : supabase.auth.signInWithPassword({ email: email.trim(), password });

    const { data, error } = await action;
    if (error) {
      setStatus("error");
      setMessage(error.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos."
        : error.message);
      return;
    }
    if (mode === "signup" && !data.session) {
      setStatus("sent");
      setMessage("Te mandamos un correo para confirmar tu cuenta. Tocá el enlace y ya vas a poder entrar.");
      return;
    }
    setStatus("idle");
    setOpen(false);
    setEmail("");
    setPassword("");
  }

  async function submitNewPassword(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setStatus("sending");
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setRecovery(false);
    setNewPassword("");
    setOpen(false);
    reset();
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setOpen(false);
    reset();
    setEmail("");
    setPassword("");
  }

  function switchMode(m: Mode) {
    setMode(m);
    reset();
  }

  const btn = "px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors";
  const field = "w-full bg-zinc-800 px-3 py-2 rounded-lg outline-none mb-2";
  const primary =
    "w-full bg-sky-700 hover:bg-sky-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors";

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((v) => !v)} className={btn} title="Tu cuenta">
        {session ? "👤" : "🔑"} <span className="hidden md:inline">{session ? "Cuenta" : "Ingresar"}</span>
      </button>

      {showPanel && (
        <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-4 z-50 text-sm">
          {!isSupabaseConfigured && (
            <p className="text-zinc-400 leading-6">
              Todavía no se configuró Supabase para esta app. Sin eso, tu posición y tus paneles se
              guardan solo en este dispositivo. Mirá <code className="text-sky-400">SUPABASE.md</code>.
            </p>
          )}

          {isSupabaseConfigured && !ready && <p className="text-zinc-500">Cargando…</p>}

          {isSupabaseConfigured && ready && recovery && (
            <form onSubmit={submitNewPassword}>
              <p className="text-zinc-300 mb-2">Elegí tu nueva contraseña.</p>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Contraseña nueva"
                className={field}
              />
              <button type="submit" disabled={status === "sending"} className={primary}>
                {status === "sending" ? "Guardando…" : "Guardar contraseña"}
              </button>
              {status === "error" && <p className="text-red-400 mt-2">{message}</p>}
            </form>
          )}

          {isSupabaseConfigured && ready && !session && !recovery && (
            <form onSubmit={submit}>
              <p className="text-zinc-300 mb-2">
                {mode === "signup"
                  ? "Creá tu cuenta para que tu posición y tus paneles te sigan a otros dispositivos."
                  : mode === "forgot"
                  ? "Te mandamos un enlace para elegir una contraseña nueva."
                  : "Ingresá para que tu posición y tus paneles te sigan a otros dispositivos."}
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className={field}
              />
              {mode !== "forgot" && (
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className={field}
                />
              )}
              <button type="submit" disabled={status === "sending"} className={primary}>
                {status === "sending"
                  ? "Un momento…"
                  : mode === "signup"
                  ? "Crear cuenta"
                  : mode === "forgot"
                  ? "Enviar enlace"
                  : "Ingresar"}
              </button>
              {status === "sent" && <p className="text-emerald-400 mt-2">{message}</p>}
              {status === "error" && <p className="text-red-400 mt-2">{message}</p>}

              <div className="flex items-center justify-between mt-3 text-zinc-500">
                {mode === "signin" && (
                  <>
                    <button type="button" onClick={() => switchMode("signup")} className="hover:text-sky-400">
                      Crear cuenta
                    </button>
                    <button type="button" onClick={() => switchMode("forgot")} className="hover:text-sky-400">
                      Olvidé mi contraseña
                    </button>
                  </>
                )}
                {mode !== "signin" && (
                  <button type="button" onClick={() => switchMode("signin")} className="hover:text-sky-400">
                    ← Volver a ingresar
                  </button>
                )}
              </div>
            </form>
          )}

          {session && !recovery && (
            <div>
              <p className="text-zinc-300 mb-1">Sesión iniciada como</p>
              <p className="text-sky-400 mb-3 break-all">{session.user.email}</p>
              <p className="text-zinc-500 mb-3">
                Tu posición y tus paneles se guardan en tu cuenta. Los módulos que importaste quedan
                solo en este dispositivo.
              </p>
              <button onClick={signOut} className={`w-full ${btn}`}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AuthPanel;
