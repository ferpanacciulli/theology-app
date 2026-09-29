import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { books } from "../bible/books";
import { chaptersByBook } from "../bible/chapters";
import { parseReference } from "../bible/parser";
import { useChapterVerses } from "../bible/useChapterVerses";
import { rtfToText } from "../modules/esword/markup";
import { useStudyStore } from "../store/useStudyStore";
import { useIsMobile } from "../useIsMobile";
import { showTab, focusBibleVersion } from "./layoutModel";
import SpeechControls from "./SpeechControls";
import ShareVerseButton from "./ShareVerseButton";

/** Todos los controles de lectura: navegar, elegir versión, buscar, escuchar y compartir. */
function ChapterBar() {
  const {
    book, chapter, verse, selection, activeSource, modules, rangeMode,
    setReference, setActiveSource, requestSearch, setMobileTab, setCurrentVerse, setRangeMode,
  } = useStudyStore();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const bibles = modules.filter((m) => m.kind === "bible");
  const { verses } = useChapterVerses(activeSource, book, chapter);

  const plainVerses = useMemo(
    () => verses.map((v) => ({ verse: v.Verse, text: rtfToText(v.Scripture) })),
    [verses]
  );
  const versionLabel = useMemo(() => {
    if (!activeSource) return "RVR1960";
    const m = bibles.find((b) => b.id === activeSource);
    return m?.abbreviation || m?.title || "Biblia";
  }, [activeSource, bibles]);
  const bookName = books.find((b) => b.id === book)?.name ?? "";
  const effectiveSelection = selection.length ? selection : [verse];

  function goToBible() {
    if (isMobile) setMobileTab("bible");
    else showTab("bible-main");
  }

  function goToSearch() {
    if (isMobile) setMobileTab("search");
    else showTab("search-main");
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    const ref = parseReference(text);
    if (ref) {
      setReference({ book: ref.book, chapter: ref.chapter, verse: ref.verse ?? 1 });
      goToBible();
    } else {
      requestSearch(text);
      goToSearch();
    }
  }

  function nextChapter() {
    if (chapter < chaptersByBook[book]) setReference({ book, chapter: chapter + 1 });
    else if (book < 66) setReference({ book: book + 1, chapter: 1 });
  }

  function previousChapter() {
    if (chapter > 1) setReference({ book, chapter: chapter - 1 });
    else if (book > 1) setReference({ book: book - 1, chapter: chaptersByBook[book - 1] });
  }

  function toggleRangeMode() {
    setRangeMode(!rangeMode);
    setMenuOpen(false);
  }

  const field = "bg-zinc-800 px-3 py-2 rounded-lg outline-none";
  const iconBtn = "bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg shrink-0";

  const bookSelect = (
    <select
      value={book}
      onChange={(e) => {
        setReference({ book: Number(e.target.value), chapter: 1 });
        setPickerOpen(false);
      }}
      className={field}
    >
      {books.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
  const chapterSelect = (
    <select
      value={chapter}
      onChange={(e) => {
        setReference({ book, chapter: Number(e.target.value) });
        setPickerOpen(false);
      }}
      className={field}
    >
      {Array.from({ length: chaptersByBook[book] }, (_, i) => (
        <option key={i + 1} value={i + 1}>{i + 1}</option>
      ))}
    </select>
  );
  const versionSelect = (
    <select
      value={activeSource}
      onChange={(e) => {
        setActiveSource(e.target.value);
        focusBibleVersion(e.target.value, modules);
      }}
      className={field}
      title="Versión que se escucha y se comparte"
    >
      <option value="">RVR1960</option>
      {bibles.map((m) => (
        <option key={m.id} value={m.id}>{m.abbreviation || m.title}</option>
      ))}
    </select>
  );
  const rangeButton = (
    <button
      onClick={toggleRangeMode}
      className={`px-3 py-2 rounded-lg transition-colors ${rangeMode ? "bg-sky-700 hover:bg-sky-600" : "bg-zinc-800 hover:bg-zinc-700"}`}
    >
      📌 {rangeMode ? "Cancelar selección" : "Elegir varios"}
    </button>
  );
  const speech = (
    <SpeechControls
      allVerses={plainVerses}
      selection={effectiveSelection}
      onVerseStart={(v) => setCurrentVerse(v)}
      resetKey={`${activeSource}:${book}:${chapter}`}
    />
  );
  const share = (
    <ShareVerseButton
      book={book}
      chapter={chapter}
      selection={effectiveSelection}
      verseText={(v) => plainVerses.find((p) => p.verse === v)?.text ?? ""}
      versionLabel={versionLabel}
    />
  );

  if (isMobile) {
    return (
      <div className="border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <button onClick={previousChapter} className={iconBtn}>←</button>
          <button
            onClick={() => { setPickerOpen((v) => !v); setMenuOpen(false); }}
            className="flex-1 min-w-0 text-center px-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 truncate"
          >
            {bookName} {chapter} ▾
          </button>
          <button onClick={nextChapter} className={iconBtn}>→</button>
          <button onClick={goToSearch} className={iconBtn} title="Buscar">🔍</button>
          <button
            onClick={() => { setMenuOpen((v) => !v); setPickerOpen(false); }}
            className={iconBtn}
            title="Más opciones"
          >
            ⋯
          </button>
        </div>

        {pickerOpen && (
          <div className="px-2 pb-2 flex gap-2">
            {bookSelect}
            {chapterSelect}
          </div>
        )}

        {menuOpen && (
          <div className="px-2 pb-3 pt-1 border-t border-zinc-800 flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap items-center">
              {versionSelect}
              {rangeButton}
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">{speech}</div>
            {share}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 flex flex-wrap items-center gap-2">
      {bookSelect}
      {chapterSelect}
      <button onClick={previousChapter} className={iconBtn}>←</button>
      <button onClick={nextChapter} className={iconBtn}>→</button>
      {versionSelect}

      <form onSubmit={submitSearch} className="flex-1 min-w-[12rem] order-last md:order-none flex">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ir a una cita (Jn 3:16) o buscar una palabra…"
          className={`${field} w-full text-center`}
        />
      </form>

      {rangeButton}
      {speech}
      {share}
      <span className="text-xs text-zinc-500 w-full md:w-auto">
        Tip: mantené Shift y tocá otro versículo para elegir un rango.
      </span>
    </div>
  );
}

export default ChapterBar;
