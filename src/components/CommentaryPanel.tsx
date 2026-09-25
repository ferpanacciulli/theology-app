import { useMemo, useState } from "react";
import * as FlexLayout from "flexlayout-react";
import { useStudyStore } from "../store/useStudyStore";
import { useModuleDb } from "../modules/useModuleDb";
import { getComments, isEncrypted } from "../modules/esword/reader";
import type { CommentEntry } from "../modules/esword/reader";
import { renderMarkup } from "../modules/esword/markup";
import { books } from "../bible/books";
import Diagnostics from "./Diagnostics";
import EncryptedNotice from "./EncryptedNotice";

function CommentaryPanel({ moduleId, node }: { moduleId?: string; node?: FlexLayout.TabNode }) {
  const { book, chapter, verse, modules, commentarySource, setCommentarySource } = useStudyStore();
  const commentaries = modules.filter((m) => m.kind === "commentary");
  const initialSelected = (node ? node.getConfig()?.source : undefined) ?? commentarySource;
  const [selected, setSelectedState] = useState<string>(initialSelected);
  const activeId = moduleId || selected || commentaries[0]?.id || "";

  function setSelected(id: string) {
    setSelectedState(id);
    if (node) {
      try {
        node
          .getModel()
          .doAction(FlexLayout.Actions.updateNodeAttributes(node.getId(), { config: { source: id } }));
      } catch {
        /* no debería fallar, pero no es crítico si lo hace */
      }
    } else {
      setCommentarySource(id);
    }
  }
  const { db, error } = useModuleDb(activeId || undefined);
  const encrypted = useMemo(() => (db ? isEncrypted(db) : false), [db]);

  const { entries, queryError } = useMemo(() => {
    if (!db) return { entries: [] as CommentEntry[], queryError: "" };
    try {
      return { entries: getComments(db, book, chapter, verse), queryError: "" };
    } catch (e) {
      return { entries: [] as CommentEntry[], queryError: e instanceof Error ? e.message : String(e) };
    }
  }, [db, book, chapter, verse]);

  return (
    <div className="h-full bg-zinc-900 text-zinc-200 p-4 overflow-auto">
      <div className="flex items-center gap-2 mb-3">
        <h1 className="text-lg font-bold">
          {books.find((b) => b.id === book)?.name} {chapter}:{verse}
        </h1>
        {!moduleId && commentaries.length > 1 && (
          <select
            value={activeId}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-zinc-800 px-2 py-1 rounded"
          >
            {commentaries.map((m) => (
              <option key={m.id} value={m.id}>{m.abbreviation || m.title}</option>
            ))}
          </select>
        )}
      </div>
      {commentaries.length === 0 && (
        <p className="text-zinc-500">Importa un comentario (.cmtx) desde la barra lateral.</p>
      )}
      {db && encrypted && <EncryptedNotice />}
      {(error || queryError) && <p className="text-red-400">{error || queryError}</p>}
      {db && !encrypted && !queryError && !entries.some((e) => e.kind === "verse") && (
        <p className="text-zinc-500">Sin comentario para este versículo.</p>
      )}
      {entries
        .filter((e) => e.kind === "verse")
        .map((e, i) => (
          <div key={i} className="leading-7 mb-4">{renderMarkup(e.text)}</div>
        ))}
      {entries
        .filter((e) => e.kind !== "verse")
        .map((e, i) => (
          <details key={`x${i}`} className="mb-3 border-t border-zinc-800 pt-2">
            <summary className="cursor-pointer text-sky-400">
              {e.kind === "chapter" ? "Introducción al capítulo" : "Introducción al libro"}
            </summary>
            <div className="leading-7 mt-2">{renderMarkup(e.text)}</div>
          </details>
        ))}
      {db && <Diagnostics db={db} />}
    </div>
  );
}

export default CommentaryPanel;
