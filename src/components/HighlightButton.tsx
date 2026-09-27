import { useEffect, useRef, useState } from "react";
import { useHighlightStore } from "../store/useHighlightStore";
import { HIGHLIGHT_COLORS, colorHex } from "../notes/colors";
import { verseKey } from "../notes/localHighlights";

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

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

  const hex = colorHex(entry?.color);
  const hasNote = !!entry?.note;
  const title = entry ? "Editar subrayado o nota" : "Subrayar o agregar una nota";

  return (
    <span className="relative inline-block align-middle -translate-y-px" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={title}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-1.5 shrink-0 transition-transform hover:scale-110"
        style={{
          backgroundColor: hex ?? "transparent",
          border: hex ? (hasNote ? "2px solid white" : "none") : `1.5px solid ${hasNote ? "#38bdf8" : "rgba(161,161,170,0.5)"}`,
        }}
      >
        {!hex && <PencilIcon className={`w-2.5 h-2.5 ${hasNote ? "text-sky-400" : "text-zinc-500"}`} />}
      </button>

      {open && (
        <div className="absolute z-40 left-0 top-full mt-1 w-60 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-3 text-sm normal-case not-italic font-sans font-normal text-zinc-200">
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
