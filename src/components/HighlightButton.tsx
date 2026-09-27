import { useEffect, useRef, useState } from "react";
import { useHighlightStore } from "../store/useHighlightStore";
import { HIGHLIGHT_COLORS } from "../notes/colors";
import { verseKey } from "../notes/localHighlights";

function HighlightButton({ book, chapter, verse }: { book: number; chapter: number; verse: number }) {
  const key = verseKey(book, chapter, verse);
  const entry = useHighlightStore((s) => s.entries[key]);
  const setHighlight = useHighlightStore((s) => s.setHighlight);
  const labelFor = useHighlightStore((s) => s.labelFor);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(entry?.note ?? "");
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (open) setNote(entry?.note ?? "");
  }, [open, entry?.note]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, note]);

  function close() {
    setOpen(false);
    const trimmed = note.trim();
    if (trimmed !== (entry?.note ?? "")) {
      setHighlight(book, chapter, verse, entry?.color ?? null, trimmed || null);
    }
  }

  function toggleColor(c: string) {
    setHighlight(book, chapter, verse, entry?.color === c ? null : (c as never), entry?.note ?? null);
  }

  return (
    <span className="relative inline-block align-baseline" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={entry ? "Editar subrayado o nota" : "Subrayar o agregar una nota"}
        className="text-xs align-super mr-1 leading-none"
      >
        {entry?.color ? (
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: HIGHLIGHT_COLORS.find((c) => c.key === entry.color)?.hex }}
          />
        ) : (
          <span className={entry?.note ? "text-sky-400" : "text-zinc-600 hover:text-zinc-400"}>
            {entry?.note ? "📝" : "✏️"}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-40 left-0 top-full mt-1 w-60 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-3 text-sm not-italic font-normal text-zinc-200">
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.key}
                title={labelFor(c.key)}
                onClick={() => toggleColor(c.key)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c.hex,
                  borderColor: entry?.color === c.key ? "#fff" : "transparent",
                }}
              />
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            rows={3}
            className="w-full bg-zinc-800 rounded-lg p-2 outline-none text-xs resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            {(entry?.color || entry?.note) && (
              <button
                onClick={() => {
                  setHighlight(book, chapter, verse, null, null);
                  setOpen(false);
                }}
                className="text-red-400 text-xs hover:underline"
              >
                Quitar
              </button>
            )}
            <button onClick={close} className="text-sky-400 text-xs hover:underline ml-auto">
              Listo
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

export default HighlightButton;
