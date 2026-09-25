import { useMemo } from "react";
import type { Database } from "sql.js";
import { describeModule } from "../modules/esword/reader";

function Diagnostics({ db }: { db: Database }) {
  const info = useMemo(() => describeModule(db), [db]);
  return (
    <details className="mt-6 text-xs text-zinc-500">
      <summary className="cursor-pointer">Diagnóstico del módulo</summary>
      {info.map((t) => (
        <div key={t.table} className="mt-2">
          <span className="text-zinc-300">{t.table}</span> ({t.rows} filas): {t.columns.join(", ")}
        </div>
      ))}
    </details>
  );
}

export default Diagnostics;
