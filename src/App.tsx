import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import Workspace from "./components/Workspace";
import MobileShell from "./components/MobileShell";
import { useIsMobile } from "./useIsMobile";
import { useEffect } from "react";
import { useStudyStore } from "./store/useStudyStore";
import { showTab } from "./components/layoutModel";
import { useAuthSync } from "./useAuthSync";

function App() {
  const isMobile = useIsMobile();
  const setMobileTab = useStudyStore((s) => s.setMobileTab);
  const focusSearch = useStudyStore((s) => s.focusSearch);
  useAuthSync();

  // Ctrl/Cmd + K abre la búsqueda.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isMobile) setMobileTab("search");
        else showTab("search-main");
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, setMobileTab, focusSearch]);

  if (isMobile) return <MobileShell />;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white">
      <div className="h-12 shrink-0">
        <Topbar />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 shrink-0">
          <Sidebar />
        </div>

        <div className="flex-1 overflow-hidden">
          <Workspace />
        </div>
      </div>
    </div>
  );
}

export default App;
