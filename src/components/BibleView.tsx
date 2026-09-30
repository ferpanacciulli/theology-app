import { useEffect, useRef } from "react";
import { books } from "../bible/books";
import { chaptersByBook } from "../bible/chapters";
import { useChapterVerses } from "../bible/useChapterVerses";
import { useStudyStore } from "../store/useStudyStore";
import { renderMarkup } from "../modules/esword/markup";
import { colorTint } from "../notes/colors";
import { verseKey } from "../notes/localHighlights";
import { useHighlightStore } from "../store/useHighlightStore";
import HighlightButton from "./HighlightButton";
import Diagnostics from "./Diagnostics";
import EncryptedNotice from "./EncryptedNotice";

/** Muestra un capítulo. `moduleId` fija la versión de esta pestaña (vacío = RVR1960 incluida). */
function BibleView({ moduleId }: { moduleId?: string }) {
  const { book, chapter, verse, selection, setReference, setSelection, setActiveSource, setLookup } =
    useStudyStore();
  const source = moduleId ?? "";
  const { verses: currentVerses, db, error, encrypted, loading } = useChapterVerses(source, book, chapter);
  const highlights = useHighlightStore((s) => s.entries);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const verseRefs = useRef<Record<number, HTMLParagraphElement | null>>({});
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    verseRefs.current[verse]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [verse, currentVerses]);

  // Seleccionar texto con el mouse (o con el dedo, en el celular) marca esos versículos,
  // igual que seleccionar cualquier texto: no hace falta ningún botón especial.
  useEffect(() => {
    function verseOf(node: Node | null): number | null {
      const el = node instanceof Element ? node : node?.parentElement ?? null;
      const withAttr = el?.closest("[data-verse]");
      const raw = withAttr?.getAttribute("data-verse");
      return raw ? Number(raw) : null;
    }

    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const container = containerRef.current;
      if (!container) return;
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;

      const a = verseOf(range.startContainer);
      const b = verseOf(range.endContainer);
      if (a === null || b === null) return;

      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const verses = currentVerses.filter((v) => v.Verse >= lo && v.Verse <= hi).map((v) => v.Verse);
      if (verses.length > 1) {
        setActiveSource(source);
        setSelection(verses);
      }
    }

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [currentVerses, source, setActiveSource, setSelection]);

  function nextChapter() {
    if (chapter < chaptersByBook[book]) setReference({ book, chapter: chapter + 1 });
    else if (book < 66) setReference({ book: book + 1, chapter: 1 });
  }
  function previousChapter() {
    if (chapter > 1) setReference({ book, chapter: chapter - 1 });
    else if (book > 1) setReference({ book: book - 1, chapter: chaptersByBook[book - 1] });
  }

  function onVerseClick(v: number) {
    // Si se acaba de arrastrar una selección de texto, se respeta esa selección
    // en vez de colapsarla al versículo tocado.
    if (window.getSelection()?.toString()) return;
    setActiveSource(source);
    setSelection([v]);
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto bg-zinc-900 text-zinc-200 p-4 md:p-6"
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const t = touch.current;
        touch.current = null;
        if (!t) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) {
          if (dx < 0) nextChapter();
          else previousChapter();
        }
      }}
    >
      <h1 className="font-serif text-3xl font-bold mb-6">
        {books.find((b) => b.id === book)?.name} {chapter}
      </h1>

      {loading && <p className="text-zinc-500">Cargando…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {encrypted && <EncryptedNotice />}
      {!loading && !encrypted && currentVerses.length === 0 && (
        <>
          <p className="text-zinc-500">Este módulo no incluye este capítulo.</p>
          {db && <Diagnostics db={db} />}
        </>
      )}

      <div className="space-y-2 max-w-4xl">
        {currentVerses.map((v) => {
          const highlight = highlights[verseKey(book, chapter, v.Verse)];
          const selected = selection.includes(v.Verse);
          return (
            <p
              key={v.Verse}
              data-verse={v.Verse}
              ref={(el) => {
                verseRefs.current[v.Verse] = el;
              }}
              onClick={() => onVerseClick(v.Verse)}
              style={{
                backgroundColor: colorTint(highlight?.color, 0.26),
                fontSize: "calc(1.15rem * var(--reading-scale, 1))",
              }}
              className={`font-serif leading-8 cursor-pointer rounded-lg px-3 py-0.5 transition-colors select-text ${
                selected ? "ring-1 ring-sky-500" : "hover:bg-zinc-800/60"
              }`}
            >
              <sup className="font-sans text-xs font-bold text-sky-400 mr-1.5 select-none">{v.Verse}</sup>
              <HighlightButton book={book} chapter={chapter} verse={v.Verse} />
              {renderMarkup(v.Scripture, setLookup)}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default BibleView;
