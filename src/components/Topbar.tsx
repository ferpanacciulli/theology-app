import { useEffect, useState } from "react";
import { applyTheme, getInitialTheme } from "../theme";
import type { Theme } from "../theme";
import { useStudyStore } from "../store/useStudyStore";
import { showTab } from "./layoutModel";
import AuthPanel from "./AuthPanel";
import FontSizeControl from "./FontSizeControl";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

function Topbar() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const focusSearch = useStudyStore((s) => s.focusSearch);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  async function install() {
    if (!installEvt) return;
    await installEvt.prompt();
    setInstallEvt(null);
  }

  const btn = "px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors";

  return (
    <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] box-content">
      <span className="font-serif text-lg tracking-wide">Teología</span>
      <div className="flex gap-2">
        <button
          onClick={() => {
            showTab("search-main");
            focusSearch();
          }}
          className={`${btn} hidden md:inline`}
          title="Buscar (Ctrl+K)"
        >
          🔍 Buscar <span className="text-zinc-500">Ctrl+K</span>
        </button>
        {installEvt && (
          <button onClick={install} className={btn} title="Instalar la app">
            ⬇️ Instalar
          </button>
        )}
        <button onClick={toggle} title="Cambiar tema" className={btn}>
          {theme === "dark" ? "☀️" : "🌙"}
          <span className="hidden md:inline">{theme === "dark" ? " Claro" : " Oscuro"}</span>
        </button>
        <FontSizeControl />
        <AuthPanel />
      </div>
    </div>
  );
}

export default Topbar;
