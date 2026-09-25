import { useEffect, useMemo, useState } from "react";
import type { Database } from "sql.js";
import { useStudyStore } from "../store/useStudyStore";
import { useModuleDb } from "../modules/useModuleDb";
import {
  entryLayout,
  getDefinition,
  getDictionarySchema,
  getEntry,
  isEncrypted,
  listEntries,
  listTables,
  sampleRows,
  searchWords,
} from "../modules/esword/reader";
import { blobToText, sniffImage } from "../modules/esword/blob";
import { renderMarkup, rtfToText } from "../modules/esword/markup";
import BibleView from "./BibleView";
import CommentaryPanel from "./CommentaryPanel";
import Diagnostics from "./Diagnostics";
import EncryptedNotice from "./EncryptedNotice";

function DictionaryView({ db }: { db: Database }) {
  const lookup = useStudyStore((s) => s.lookup);
  const [q, setQ] = useState("");
  const [word, setWord] = useState("");

  useEffect(() => {
    if (lookup) {
      setQ(lookup);
      setWord(lookup);
    }
  }, [lookup]);

  const { words, err } = useMemo(() => {
    try {
      return { words: searchWords(db, q), err: "" };
    } catch (e) {
      return { words: [] as string[], err: e instanceof Error ? e.message : String(e) };
    }
  }, [db, q]);
  const definition = useMemo(() => {
    try {
      return word ? getDefinition(db, word) : null;
    } catch {
      return null;
    }
  }, [db, word]);
  const content = useMemo(() => (definition ? renderMarkup(definition) : null), [definition]);

  return (
    <div className="h-full flex bg-zinc-900 text-zinc-200">
      <div className="w-56 shrink-0 border-r border-zinc-800 flex flex-col">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar palabra o G1234"
          className="bg-zinc-800 m-2 px-3 py-2 rounded-lg outline-none"
        />
        <div className="flex-1 overflow-auto">
          {err && <p className="text-red-400 text-sm px-3">{err}</p>}
          {words.map((w) => (
            <button
              key={w}
              onClick={() => setWord(w)}
              className={`block w-full text-left px-3 py-1 hover:bg-zinc-800 ${
                w === word ? "bg-zinc-800 text-sky-400" : ""
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {word && <h1 className="text-xl font-bold mb-3">{word}</h1>}
        {word && definition === null && (
          <p className="text-zinc-500">Sin definición para «{word}» en este módulo.</p>
        )}
        {content && <div className="whitespace-pre-wrap leading-7">{content}</div>}
        <Diagnostics db={db} />
      </div>
    </div>
  );
}

function EntryImage({ bytes }: { bytes: Uint8Array }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const img = sniffImage(bytes);
    if (!img) {
      setUrl("");
      return;
    }
    const u = URL.createObjectURL(new Blob([new Uint8Array(img.data)], { type: img.mime }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [bytes]);

  if (!url) return <p className="text-zinc-500 text-sm">Formato de imagen no reconocido.</p>;
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Abrir la imagen a tamaño completo">
      <img src={url} alt="" className="max-w-full h-auto rounded-lg mb-4" />
    </a>
  );
}

/** Referencias, devocionales y mapas: lista de títulos + contenido (con imágenes). */
function EntriesView({ db }: { db: Database }) {
  const layout = useMemo(() => entryLayout(db), [db]);
  const entries = useMemo(() => (layout ? listEntries(db, layout) : []), [db, layout]);
  const [filter, setFilter] = useState("");
  const [id, setId] = useState<number | null>(null);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? entries.filter((e) => e.title.toLowerCase().includes(f)) : entries;
  }, [entries, filter]);

  const current = id ?? shown[0]?.id ?? null;
  const entry = useMemo(
    () => (layout && current !== null ? getEntry(db, layout, current) : null),
    [db, layout, current]
  );
  const content = useMemo(
    () => (entry?.body ? renderMarkup(entry.body) : null),
    [entry]
  );

  return (
    <div className="h-full flex bg-zinc-900 text-zinc-200">
      <div className="w-64 shrink-0 border-r border-zinc-800 flex flex-col">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar…"
          className="bg-zinc-800 m-2 px-3 py-2 rounded-lg outline-none"
        />
        <div className="flex-1 overflow-auto">
          {shown.map((e) => (
            <button
              key={e.id}
              onClick={() => setId(e.id)}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-800 ${
                e.id === current ? "bg-zinc-800 text-sky-400" : ""
              }`}
            >
              {e.title}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {current !== null && (
          <h1 className="font-serif text-2xl font-bold mb-4">
            {entries.find((e) => e.id === current)?.title}
          </h1>
        )}
        {entry?.pic && <EntryImage bytes={entry.pic} />}
        {entry && entry.body === null && (
          <p className="text-zinc-500">Contenido no legible.</p>
        )}
        {content && <div className="leading-7 whitespace-pre-wrap max-w-4xl">{content}</div>}
      </div>
    </div>
  );
}

function RawTableView({ db }: { db: Database }) {
  const tables = useMemo(() => listTables(db), [db]);
  const [table, setTable] = useState(tables[0] ?? "");
  const rows = useMemo(() => (table ? sampleRows(db, table) : []), [db, table]);

  const show = (v: unknown) =>
    v instanceof Uint8Array
      ? blobToText(v)?.slice(0, 600) ?? `[binario, ${v.length} bytes]`
      : rtfToText(String(v ?? "")).slice(0, 600);

  return (
    <div className="h-full overflow-auto bg-zinc-900 text-zinc-200 p-4">
      <p className="text-sm text-zinc-500 mb-3">
        Vista básica: este tipo de módulo todavía no tiene lector propio.
      </p>
      <select
        value={table}
        onChange={(e) => setTable(e.target.value)}
        className="bg-zinc-800 px-3 py-2 rounded-lg mb-4"
      >
        {tables.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {rows.map((row, i) => (
        <div key={i} className="mb-3 border-b border-zinc-800 pb-2 text-sm">
          {Object.entries(row).map(([k, v]) => (
            <div key={k}>
              <span className="text-sky-400">{k}: </span>
              <span className="whitespace-pre-wrap">{show(v)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ModuleView({ moduleId }: { moduleId: string }) {
  const meta = useStudyStore((s) => s.modules.find((m) => m.id === moduleId));
  const { db, error } = useModuleDb(moduleId);
  const encrypted = useMemo(() => (db ? isEncrypted(db) : false), [db]);

  if (error) return <div className="p-4 text-red-400 bg-zinc-900 h-full">{error}</div>;
  if (!meta) return <div className="p-4 text-zinc-500 bg-zinc-900 h-full">Módulo no disponible.</div>;

  if (meta.kind === "bible") return <BibleView moduleId={moduleId} />;
  if (meta.kind === "commentary") return <CommentaryPanel moduleId={moduleId} />;
  if (!db) return <div className="p-4 text-zinc-500 bg-zinc-900 h-full">Cargando…</div>;
  if (encrypted) return <div className="bg-zinc-900 h-full"><EncryptedNotice /></div>;
  if (meta.kind === "dictionary" && getDictionarySchema(db)) return <DictionaryView db={db} />;
  if (entryLayout(db)) return <EntriesView db={db} />;
  return <RawTableView db={db} />;
}

export default ModuleView;
