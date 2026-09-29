import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { books } from "../bible/books";
import { parseReference } from "../bible/parser";
import { useStudyStore } from "../store/useStudyStore";
import { useIsMobile } from "../useIsMobile";
import { showTab } from "./layoutModel";
import EncryptedNotice from "./EncryptedNotice";
import { loadIndex, norm, parseQuery, runSearch } from "../search/searchIndex";
import type { VerseIndex } from "../search/searchIndex";

const PAGE = 50;

function scopeFn(scope: string): (book: number) => boolean {
  if (scope === "ot") return (b) => b <= 39;
  if (scope === "nt") return (b) => b >= 40;
  if (scope.startsWith("b")) {
    const id = Number(scope.slice(1));
    return (b) => b === id;
  }
  return () => true;
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const n = norm(text);
  if (!terms.length || n.length !== text.length) return <>{text}</>;

  const ranges: [number, number][] = [];
  for (const t of terms) {
    let i = n.indexOf(t);
    while (i !== -1) {
      ranges.push([i, i + t.length]);
      i = n.indexOf(t, i + t.length);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }

  const out: ReactNode[] = [];
  let pos = 0;
  merged.forEach(([a, b], k) => {
    if (a > pos) out.push(text.slice(pos, a));
    out.push(
      <mark key={k} className="bg-amber-400/30 text-inherit rounded px-0.5">
        {text.slice(a, b)}
      </mark>
    );
    pos = b;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return <>{out}</>;
}

function SearchView() {
  const modules = useStudyStore((s) => s.modules);
  const setReference = useStudyStore((s) => s.setReference);
  const setMobileTab = useStudyStore((s) => s.setMobileTab);
  const searchFocus = useStudyStore((s) => s.searchFocus);
  const searchRequest = useStudyStore((s) => s.searchRequest);
  const isMobile = useIsMobile();
  const bibles = modules.filter((m) => m.kind === "bible");

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [source, setSource] = useState("");
  const [scope, setScope] = useState("all");
  const [whole, setWhole] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [state, setState] = useState<{ index: VerseIndex | null; error: string; loading: boolean }>({
    index: null,
    error: "",
    loading: false,
  });
  const input = useRef<HTMLInputElement>(null);
  const active = query.trim().length > 0;

  useEffect(() => {
    if (searchFocus > 0) input.current?.focus();
  }, [searchFocus]);

  useEffect(() => {
    if (searchRequest.n > 0) {
      setQuery(searchRequest.q);
      input.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRequest.n]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query);
      setLimit(PAGE);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // El índice se arma la primera vez que se busca, y una vez por versión.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setState({ index: null, error: "", loading: true });
    loadIndex(source)
      .then((index) => !cancelled && setState({ index, error: "", loading: false }))
      .catch(
        (e) =>
          !cancelled &&
          setState({ index: null, error: e instanceof Error ? e.message : String(e), loading: false })
      );
    return () => {
      cancelled = true;
    };
  }, [source, active]);

  const parsed = useMemo(() => parseQuery(debounced), [debounced]);
  const results = useMemo(
    () => (state.index ? runSearch(state.index, parsed, scopeFn(scope), whole) : []),
    [state.index, parsed, scope, whole]
  );
  const jump = useMemo(() => parseReference(query.trim()), [query]);

  function goTo(book: number, chapter: number, verse: number | null) {
    setReference({ book, chapter, verse: verse ?? 1 });
    if (isMobile) setMobileTab("bible");
    else showTab("bible-main");
  }

  const field = "bg-zinc-800 px-3 py-2 rounded-lg outline-none";
  const bookName = (id: number) => books.find((b) => b.id === id)?.name ?? "";

  return (
    <div className="h-full overflow-auto bg-zinc-900 text-zinc-200 p-4 md:p-6">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar palabra, frase, cita o G26…"
          className={`${field} min-w-0 flex-1 basis-56`}
        />
        <select value={source} onChange={(e) => setSource(e.target.value)} className={field}>
          <option value="">RVR1960</option>
          {bibles.map((m) => (
            <option key={m.id} value={m.id}>{m.abbreviation || m.title}</option>
          ))}
        </select>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className={field}>
          <option value="all">Toda la Biblia</option>
          <option value="ot">Antiguo Testamento</option>
          <option value="nt">Nuevo Testamento</option>
          {books.map((b) => (
            <option key={b.id} value={`b${b.id}`}>{b.name}</option>
          ))}
        </select>
        <label className="text-sm flex items-center gap-1.5 text-zinc-500">
          <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
          Palabra completa
        </label>
      </div>

      {jump && (
        <button
          onClick={() => goTo(jump.book, jump.chapter, jump.verse)}
          className="w-full text-left mb-3 px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 transition-colors"
        >
          Ir a {bookName(jump.book)} {jump.chapter}
          {jump.verse ? `:${jump.verse}` : ""} →
        </button>
      )}

      {!active && (
        <div className="text-sm text-zinc-500 leading-6">
          <p>Escribe una o varias palabras: se buscan los versículos que las contengan todas, sin importar las tildes.</p>
          <p>Ejemplos: <b>amor</b> · <b>"el que cree"</b> (frase exacta) · <b>G26</b> (número Strong) · <b>Jn 3:16</b> (ir a una cita)</p>
        </div>
      )}

      {active && state.loading && <p className="text-zinc-500">Indexando… (solo la primera vez)</p>}
      {state.error === "cifrado" && <EncryptedNotice />}
      {state.error && state.error !== "cifrado" && <p className="text-red-400">{state.error}</p>}

      {state.index && active && (
        <>
          <p className="text-sm text-zinc-500 mb-3">
            {results.length} {results.length === 1 ? "resultado" : "resultados"}
            {parsed.strong && !state.index.hasStrongs && " · esta versión no tiene números Strong"}
          </p>
          <div className="space-y-1 max-w-4xl">
            {results.slice(0, limit).map((e) => (
              <button
                key={`${e.book}:${e.chapter}:${e.verse}`}
                onClick={() => goTo(e.book, e.chapter, e.verse)}
                className="block w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className="text-xs font-bold text-sky-400 mb-0.5">
                  {bookName(e.book)} {e.chapter}:{e.verse}
                </div>
                <div className="font-serif leading-7">
                  <Highlighted text={e.text} terms={parsed.terms} />
                </div>
              </button>
            ))}
          </div>
          {results.length > limit && (
            <button
              onClick={() => setLimit(limit + PAGE)}
              className="mt-3 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Mostrar más ({results.length - limit})
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default SearchView;
