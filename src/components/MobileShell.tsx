import { useStudyStore } from "../store/useStudyStore";
import type { MobileTab } from "../store/useStudyStore";
import Topbar from "./Topbar";
import BibleView from "./BibleView";
import CommentaryPanel from "./CommentaryPanel";
import Sidebar from "./Sidebar";
import ModuleView from "./ModuleView";
import SearchView from "./SearchView";
import HighlightsView from "./HighlightsView";
import PlansView from "./PlansView";
import VerseOfDay from "./VerseOfDay";

const TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: "bible", label: "Biblia", icon: "📖" },
  { id: "search", label: "Buscar", icon: "🔍" },
  { id: "commentary", label: "Comentario", icon: "💬" },
  { id: "library", label: "Biblioteca", icon: "📚" },
  { id: "notes", label: "Notas", icon: "📝" },
  { id: "plan", label: "Plan", icon: "📅" },
];

function MobileShell() {
  const tab = useStudyStore((s) => s.mobileTab);
  const moduleId = useStudyStore((s) => s.mobileModuleId);
  const setTab = useStudyStore((s) => s.setMobileTab);
  const active = tab === "module" ? "library" : tab;

  return (
    <div className="h-dvh flex flex-col bg-zinc-950 text-white">
      <div className="shrink-0">
        <Topbar />
        <VerseOfDay />
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Se mantienen montadas para conservar la posición y la versión elegida. */}
        <div className={tab === "bible" ? "h-full" : "hidden"}>
          <BibleView />
        </div>
        <div className={tab === "search" ? "h-full" : "hidden"}>
          <SearchView />
        </div>
        <div className={tab === "commentary" ? "h-full" : "hidden"}>
          <CommentaryPanel />
        </div>
        <div className={tab === "library" ? "h-full" : "hidden"}>
          <Sidebar />
        </div>
        <div className={tab === "notes" ? "h-full" : "hidden"}>
          <HighlightsView />
        </div>
        <div className={tab === "plan" ? "h-full" : "hidden"}>
          <PlansView />
        </div>
        {tab === "module" && (
          <div className="h-full flex flex-col">
            <button
              onClick={() => setTab("library")}
              className="shrink-0 text-left px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-sky-400"
            >
              ← Biblioteca
            </button>
            <div className="flex-1 overflow-hidden">
              <ModuleView moduleId={moduleId} />
            </div>
          </div>
        )}
      </div>

      <nav className="shrink-0 flex border-t border-zinc-800 bg-zinc-900 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs flex flex-col items-center gap-0.5 transition-colors ${
              active === t.id ? "text-sky-400" : "text-zinc-500"
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default MobileShell;
