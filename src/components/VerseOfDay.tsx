import { useEffect, useState } from "react";
import { verseOfTheDay } from "../plans/votd";
import { getRVR60Verse } from "../bible/rvr60";
import { renderMarkup } from "../modules/esword/markup";
import { books } from "../bible/books";
import { useStudyStore } from "../store/useStudyStore";
import { useIsMobile } from "../useIsMobile";
import { showTab } from "./layoutModel";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function VerseOfDay() {
  const ref = verseOfTheDay();
  const [text, setText] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("teologia:votd-dismissed") === todayKey()
  );
  const setReference = useStudyStore((s) => s.setReference);
  const setMobileTab = useStudyStore((s) => s.setMobileTab);
  const isMobile = useIsMobile();

  useEffect(() => {
    getRVR60Verse(ref.book, ref.chapter, ref.verse).then(setText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed || !text) return null;

  function dismiss() {
    localStorage.setItem("teologia:votd-dismissed", todayKey());
    setDismissed(true);
  }

  function goRead() {
    setReference({ book: ref.book, chapter: ref.chapter, verse: ref.verse });
    if (isMobile) setMobileTab("bible");
    else showTab("bible-main");
  }

  const bookName = books.find((b) => b.id === ref.book)?.name ?? "";

  return (
    <div className="bg-sky-950/60 border-b border-sky-900 px-4 py-2.5 flex items-start gap-3">
      <span className="text-lg leading-none mt-0.5">🌅</span>
      <button onClick={goRead} className="flex-1 min-w-0 text-left">
        <div className="text-xs text-sky-400 font-bold uppercase tracking-wide mb-0.5">
          Versículo del día · {bookName} {ref.chapter}:{ref.verse}
        </div>
        <div className="font-serif text-sm text-zinc-200 leading-6 line-clamp-2">
          {renderMarkup(text)}
        </div>
      </button>
      <button onClick={dismiss} className="text-zinc-500 hover:text-zinc-300 shrink-0 px-1" title="Cerrar por hoy">
        ×
      </button>
    </div>
  );
}

export default VerseOfDay;
