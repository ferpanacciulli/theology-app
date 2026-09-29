import { useState } from "react";
import { books } from "../bible/books";
import { formatVerseRange } from "../bible/verseRange";

interface Props {
  book: number;
  chapter: number;
  /** Versículos seleccionados, en orden. */
  selection: number[];
  /** Texto de cada versículo del capítulo, para armar el mensaje. */
  verseText: (verse: number) => string;
  /** "RVR1960", o la abreviatura del módulo importado activo. */
  versionLabel: string;
}

function ShareVerseButton({ book, chapter, selection, verseText, versionLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const name = books.find((b) => b.id === book)?.name ?? "";
    const multiple = selection.length > 1;
    const body = selection
      .map((v) => {
        const t = verseText(v);
        return multiple ? `${v} ${t}` : t;
      })
      .filter(Boolean)
      .join(" ");
    const cite = `${name} ${chapter}:${formatVerseRange(selection)} (${versionLabel})`;
    const message = body ? `"${body}"\n${cite}` : cite;

    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch {
        /* la persona canceló el diálogo de compartir; no hay nada que hacer */
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* portapapeles no disponible (http sin https, permisos, etc.) */
    }
  }

  const hasText = selection.some((v) => verseText(v));

  return (
    <button
      onClick={share}
      disabled={!hasText}
      title={selection.length > 1 ? "Compartir los versículos seleccionados" : "Compartir este versículo"}
      className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
    >
      {copied ? "✅ Copiado" : "🔗 Compartir"}
    </button>
  );
}

export default ShareVerseButton;
