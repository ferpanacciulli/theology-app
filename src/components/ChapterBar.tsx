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

/** Todos los controles de lectura, en una sola barra arriba: navegar, elegir versión, buscar, escuchar y compartir. */
function ChapterBar() {
  const {
    book, chapter, verse, selection, activeSource, modules,
    setReference, setActiveSource, requestSearch, setMobileTab, setCurrentVerse,
  } = useStudyStore();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
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

  const field = "bg-zinc-800 px-3 py-2 rounded-lg outline-none";

  return (
    <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-2 flex flex-wrap items-center gap-2">
      <select
        value={book}
        onChange={(e) => setReference({ book: Number(e.target.value), chapter: 1 })}
        className={field}
      >
        {books.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <select
        value={chapter}
        onChange={(e) => setReference({ book, chapter: Number(e.target.value) })}
        className={field}
      >
        {Array.from({ length: chaptersByBook[book] }, (_, i) => (
          <option key={i + 1} value={i + 1}>{i + 1}</option>
        ))}
      </select>
      <button onClick={previousChapter} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg">←</button>
      <button onClick={nextChapter} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg">→</button>

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

      <form onSubmit={submitSearch} className="flex-1 min-w-[12rem] order-last md:order-none flex">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ir a una cita (Jn 3:16) o buscar una palabra…"
          className={`${field} w-full text-center`}
        />
      </form>

      <SpeechControls
        allVerses={plainVerses}
        selection={selection.length ? selection : [verse]}
        onVerseStart={(v) => setCurrentVerse(v)}
        resetKey={`${activeSource}:${book}:${chapter}`}
      />
      <ShareVerseButton
        book={book}
        chapter={chapter}
        selection={selection.length ? selection : [verse]}
        verseText={(v) => plainVerses.find((p) => p.verse === v)?.text ?? ""}
        versionLabel={versionLabel}
      />
    </div>
  );
}

export default ChapterBar;
