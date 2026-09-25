import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";

function AuthPanel() {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setStatus("sending");
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (err) {
      setStatus("error");
      setError(err.message);
    } else {
      setStatus("sent");
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setOpen(false);
    setStatus("idle");
    setEmail("");
  }

  const btn = "px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors";

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((v) => !v)} className={btn} title="Tu cuenta">
        {session ? "👤" : "🔑"} <span className="hidden md:inline">{session ? "Cuenta" : "Ingresar"}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-4 z-50 text-sm">
          {!isSupabaseConfigured && (
            <p className="text-zinc-400 leading-6">
              Todavía no se configuró Supabase para esta app. Sin eso, tus notas y tu posición se
              guardan solo en este dispositivo. Mirá <code className="text-sky-400">SUPABASE.md</code> para
              activar las cuentas.
            </p>
          )}

          {isSupabaseConfigured && !ready && <p className="text-zinc-500">Cargando…</p>}

          {isSupabaseConfigured && ready && !session && (
            <form onSubmit={sendLink}>
              <p className="text-zinc-300 mb-2">
                Inicia sesión para que tu posición, tu disposición de paneles y tus notas te sigan
                a otros dispositivos.
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full bg-zinc-800 px-3 py-2 rounded-lg outline-none mb-2"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full bg-sky-700 hover:bg-sky-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
              >
                {status === "sending" ? "Enviando…" : "Enviar enlace de acceso"}
              </button>
              {status === "sent" && (
                <p className="text-emerald-400 mt-2">
                  Revisa tu correo y toca el enlace para entrar. Podés cerrar esta ventana.
                </p>
              )}
              {status === "error" && <p className="text-red-400 mt-2">{error}</p>}
              <p className="text-zinc-500 mt-2">
                Sin contraseña: te mandamos un enlace de acceso único a tu correo.
              </p>
            </form>
          )}

          {session && (
            <div>
              <p className="text-zinc-300 mb-1">Sesión iniciada como</p>
              <p className="text-sky-400 mb-3 break-all">{session.user.email}</p>
              <p className="text-zinc-500 mb-3">
                Tu posición, tu disposición de paneles y tus notas se guardan en tu cuenta. Los
                módulos que importaste quedan solo en este dispositivo.
              </p>
              <button
                onClick={signOut}
                className="w-full bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors"
              >
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
