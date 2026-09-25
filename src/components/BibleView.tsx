import { useEffect, useMemo, useRef, useState } from "react";
import * as FlexLayout from "flexlayout-react";
import { books } from "../bible/books";
import { chaptersByBook } from "../bible/chapters";
import { parseReference } from "../bible/parser";
import { useStudyStore } from "../store/useStudyStore";
import { useModuleDb } from "../modules/useModuleDb";
import { getChapterVerses, isEncrypted } from "../modules/esword/reader";
import { renderMarkup } from "../modules/esword/markup";
import Diagnostics from "./Diagnostics";
import EncryptedNotice from "./EncryptedNotice";

interface Verse {
  Book: number;
  Chapter: number;
  Verse: number;
  Scripture: string;
}

type Index = Map<string, Verse[]>;

let cache: Promise<Index> | null = null;

// La RVR60 se carga en un chunk aparte, no en el bundle principal.
function loadBible(): Promise<Index> {
  if (!cache) {
    cache = import("../data/RVR60.json").then((mod) => {
      const idx: Index = new Map();
      for (const v of (mod.default as { verses: Verse[] }).verses) {
        const key = `${v.Book}:${v.Chapter}`;
        const list = idx.get(key);
        if (list) list.push(v);
        else idx.set(key, [v]);
      }
      return idx;
    });
  }
  return cache;
}

function BibleView({ moduleId, node }: { moduleId?: string; node?: FlexLayout.TabNode }) {
  const { book, chapter, verse, modules, bibleSource, setReference, setLookup, setBibleSource } =
    useStudyStore();
  const bibles = modules.filter((m) => m.kind === "bible");
  // Pestaña de un módulo abierto directamente: fija. Pestaña principal (con `node`): recuerda
  // la última versión elegida ahí. Sin ninguna de las dos (celular): recuerda la última global.
  const initialSource = moduleId ?? (node ? node.getConfig()?.source : undefined) ?? bibleSource;
  const [source, setSourceState] = useState<string>(initialSource);

  function setSource(id: string) {
    setSourceState(id);
    if (node) {
      try {
        node
          .getModel()
          .doAction(FlexLayout.Actions.updateNodeAttributes(node.getId(), { config: { source: id } }));
      } catch {
        /* no debería fallar, pero no es crítico si lo hace */
      }
    } else if (!moduleId) {
      setBibleSource(id);
    }
  }
  const { db, error } = useModuleDb(source || undefined);
  const encrypted = useMemo(() => (db ? isEncrypted(db) : false), [db]);
  const [index, setIndex] = useState<Index | null>(null);
  const [reference, setRef] = useState("");
  const verseRefs = useRef<Record<number, HTMLParagraphElement | null>>({});
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    loadBible().then(setIndex);
  }, []);

  const currentVerses = useMemo(() => {
    if (source) return db ? getChapterVerses(db, book, chapter) : [];
    return (index?.get(`${book}:${chapter}`) ?? []).map((v) => ({
      Verse: v.Verse,
      Scripture: v.Scripture,
    }));
  }, [source, db, index, book, chapter]);

  useEffect(() => {
    verseRefs.current[verse]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [verse, currentVerses]);

  function nextChapter() {
    if (chapter < chaptersByBook[book]) setReference({ book, chapter: chapter + 1 });
    else if (book < 66) setReference({ book: book + 1, chapter: 1 });
  }

  function previousChapter() {
    if (chapter > 1) setReference({ book, chapter: chapter - 1 });
    else if (book > 1) setReference({ book: book - 1, chapter: chaptersByBook[book - 1] });
  }

  function goToReference() {
    const p = parseReference(reference);
    if (p) setReference({ book: p.book, chapter: p.chapter, verse: p.verse ?? 1 });
  }

  const field = "bg-zinc-800 px-3 py-2 rounded-lg outline-none";

  return (
    <div
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
        // Deslizar horizontalmente cambia de capítulo.
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) {
          if (dx < 0) nextChapter();
          else previousChapter();
        }
      }}
    >
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input
          type="text"
          value={reference}
          onChange={(e) => setRef(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && goToReference()}
          placeholder="Jn 3:16"
          className={`${field} min-w-0 flex-1 md:flex-none`}
        />
        <button onClick={goToReference} className="bg-sky-700 hover:bg-sky-600 px-4 py-2 rounded-lg">
          Ir
        </button>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={field}
        >
          <option value="">RVR1960</option>
          {bibles.map((m) => (
            <option key={m.id} value={m.id}>{m.abbreviation || m.title}</option>
          ))}
        </select>
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
        <button onClick={previousChapter} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg">←</button>
        <button onClick={nextChapter} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg">→</button>
      </div>

      <h1 className="font-serif text-3xl font-bold mb-8">
        {books.find((b) => b.id === book)?.name} {chapter}
      </h1>

      {!source && !index && <p className="text-zinc-500">Cargando…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {source && db && encrypted && <EncryptedNotice />}
      {source && db && !encrypted && currentVerses.length === 0 && (
        <>
          <p className="text-zinc-500">Este módulo no incluye este capítulo.</p>
          <Diagnostics db={db} />
        </>
      )}

      <div className="space-y-2 max-w-4xl">
        {currentVerses.map((v) => (
          <p
            key={v.Verse}
            ref={(el) => {
              verseRefs.current[v.Verse] = el;
            }}
            onClick={() => setReference({ book, chapter, verse: v.Verse })}
            className={`font-serif leading-8 text-[1.15rem] cursor-pointer rounded-lg px-3 py-0.5 transition-colors ${
              v.Verse === verse ? "bg-sky-900/40" : "hover:bg-zinc-800/60"
            }`}
          >
            <sup className="font-sans text-xs font-bold text-sky-400 mr-1.5">{v.Verse}</sup>
            {renderMarkup(v.Scripture, setLookup)}
          </p>
        ))}
      </div>
    </div>
  );
}

export default BibleView;
