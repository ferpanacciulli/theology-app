import { useState } from "react";
import { books } from "../bible/books";

interface Props {
  book: number;
  chapter: number;
  verse: number;
  text: string; // texto plano, ya limpio
}

function ShareVerseButton({ book, chapter, verse, text }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const name = books.find((b) => b.id === book)?.name ?? "";
    const message = text ? `"${text}"\n${name} ${chapter}:${verse}` : `${name} ${chapter}:${verse}`;

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

  return (
    <button
      onClick={share}
      disabled={!text}
      title="Compartir este versículo"
      className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
    >
      {copied ? "✅ Copiado" : "🔗 Compartir"}
    </button>
  );
}

export default ShareVerseButton;
