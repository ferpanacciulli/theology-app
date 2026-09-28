import { useMemo, useState } from "react";
import { books } from "../bible/books";
import { useStudyStore } from "../store/useStudyStore";
import { useHighlightStore } from "../store/useHighlightStore";
import { HIGHLIGHT_COLORS } from "../notes/colors";
import { useIsMobile } from "../useIsMobile";
import { showTab } from "./layoutModel";
import { norm } from "../search/searchIndex";
import { getRVR60Verse } from "../bible/rvr60";
import { rtfToText } from "../modules/esword/markup";

function HighlightsView() {
  const entries = useHighlightStore((s) => s.entries);
  const colorLabels = useHighlightStore((s) => s.colorLabels);
  const setColorLabel = useHighlightStore((s) => s.setColorLabel);
  const setHighlight = useHighlightStore((s) => s.setHighlight);
  const labelFor = useHighlightStore((s) => s.labelFor);
  const setReference = useStudyStore((s) => s.setReference);
  const setMobileTab = useStudyStore((s) => s.setMobileTab);
  const isMobile = useIsMobile();

  const [filterBook, setFilterBook] = useState<number | "">("");
  const [filterColor, setFilterColor] = useState<string>("");
  const [query, setQuery] = useState("");
  const [editingColors, setEditingColors] = useState(false);
  const [exporting, setExporting] = useState(false);

  const q = norm(query.trim());
  const list = useMemo(
    () =>
      Object.values(entries)
        .filter(
          (e) =>
            (filterBook === "" || e.book === filterBook) &&
            (!filterColor || e.color === filterColor) &&
            (!q || (e.note && norm(e.note).includes(q)))
        )
        .sort((a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse),
    [entries, filterBook, filterColor, q]
  );

  async function exportNotes() {
    setExporting(true);
    try {
      const all = Object.values(entries).sort(
        (a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse
      );
      const lines = [`# Mis notas y subrayados`, ``, `Exportado el ${new Date().toLocaleDateString()}`, ``];
      for (const e of all) {
        const name = books.find((b) => b.id === e.book)?.name ?? "";
        const raw = await getRVR60Verse(e.book, e.chapter, e.verse);
        const plain = raw ? rtfToText(raw) : "";
        lines.push(`## ${name} ${e.chapter}:${e.verse}${e.color ? " — " + labelFor(e.color) : ""}`);
        if (plain) lines.push(`> ${plain}`);
        if (e.note) {
          lines.push("");
          lines.push(e.note);
        }
        lines.push("");
      }
      const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mis-notas-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function goTo(book: number, chapter: number, verse: number) {
    setReference({ book, chapter, verse });
    if (isMobile) setMobileTab("bible");
    else showTab("bible-main");
  }

  const field = "bg-zinc-800 px-3 py-2 rounded-lg outline-none";

  return (
    <div className="h-full overflow-auto bg-zinc-900 text-zinc-200 p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h1 className="font-serif text-2xl font-bold">Mis notas y subrayados</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={exportNotes}
            disabled={exporting || Object.keys(entries).length === 0}
            className="text-sm text-sky-400 hover:underline disabled:opacity-40 disabled:hover:no-underline"
          >
            {exporting ? "Generando…" : "⬇️ Exportar"}
          </button>
          <button onClick={() => setEditingColors((v) => !v)} className="text-sm text-sky-400 hover:underline">
            {editingColors ? "Listo" : "Nombrar colores"}
          </button>
        </div>
      </div>

      {editingColors && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
          {HIGHLIGHT_COLORS.map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
              <input
                defaultValue={colorLabels[c.key] ?? c.defaultLabel}
                onBlur={(e) => setColorLabel(c.key, e.target.value.trim() || c.defaultLabel)}
                className="bg-zinc-800 px-2 py-1 rounded-lg text-sm flex-1 min-w-0"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en tus notas…"
          className={`${field} min-w-0 flex-1 basis-48`}
        />
        <select
          value={filterBook}
          onChange={(e) => setFilterBook(e.target.value ? Number(e.target.value) : "")}
          className={field}
        >
          <option value="">Todos los libros</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)} className={field}>
          <option value="">Todos los colores</option>
          {HIGHLIGHT_COLORS.map((c) => (
            <option key={c.key} value={c.key}>{labelFor(c.key)}</option>
          ))}
        </select>
      </div>

      {list.length === 0 && Object.keys(entries).length === 0 && (
        <p className="text-zinc-500">
          Todavía no marcaste ningún versículo. Tocá el círculo que aparece al lado de cada
          versículo en la Biblia.
        </p>
      )}
      {list.length === 0 && Object.keys(entries).length > 0 && (
        <p className="text-zinc-500">Nada coincide con ese filtro o esa búsqueda.</p>
      )}

      <div className="space-y-2 max-w-3xl">
        {list.map((e) => (
          <div key={`${e.book}:${e.chapter}:${e.verse}`} className="rounded-lg bg-zinc-800/60 p-3 flex gap-3">
            <span
              className="w-3 h-3 rounded-full mt-1 shrink-0"
              style={{ backgroundColor: HIGHLIGHT_COLORS.find((c) => c.key === e.color)?.hex ?? "transparent" }}
            />
            <div className="flex-1 min-w-0">
              <button
                onClick={() => goTo(e.book, e.chapter, e.verse)}
                className="text-sky-400 font-bold text-sm hover:underline"
              >
                {books.find((b) => b.id === e.book)?.name} {e.chapter}:{e.verse}
              </button>
              {e.color && <span className="text-zinc-500 text-xs ml-2">{labelFor(e.color)}</span>}
              {e.note && <p className="text-sm mt-1 whitespace-pre-wrap">{e.note}</p>}
            </div>
            <button
              onClick={() => setHighlight(e.book, e.chapter, e.verse, null, null)}
              className="text-zinc-500 hover:text-red-400 text-xs shrink-0"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HighlightsView;
