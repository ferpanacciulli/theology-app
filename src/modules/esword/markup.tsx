import type { ReactNode } from "react";
import { hexToDataUrl } from "./blob";

/** Texto plano (para vistas de depuración). */
export function rtfToText(s: string): string {
  return s
    .replace(/\{\\\*[^{}]*\}/g, "")
    .replace(/\\par[d]?\b ?|\\line ?/g, "\n")
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, n: string) =>
      String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n))
    )
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/<\/?[A-Za-z]{1,6}\d*>/g, "")
    .trim();
}

const TOKEN =
  /(<\/?[A-Za-z]{1,6}\d*>|\\'[0-9a-fA-F]{2}|\\u-?\d+\??|\\[\\{}]|\\[-_~]|\\\*|\\[a-zA-Z]+-?\d* ?|[{}])/;
const SKIP_GROUPS = new Set([
  "fonttbl", "colortbl", "stylesheet", "info", "header", "footer", "nonshppict",
]);
const PICT_MIME = new Map([
  ["pngblip", "image/png"],
  ["jpegblip", "image/jpeg"],
]);
const PICT_UNSUPPORTED = /^(wmetafile\d*|emfblip|dibitmap\d*|wbitmap\d*|macpict)$/;
const cp1252 = new TextDecoder("windows-1252");

interface PictState {
  depth: number;
  mime: string | null;
  hex: string;
}

/**
 * Convierte el texto de un módulo de e-Sword (marcas <FI>, <FR>, <CM>, <WG1234>...
 * y RTF, incluidas imágenes \pict) a elementos de React.
 */
export function renderMarkup(text: string, onStrong?: (code: string) => void): ReactNode[] {
  const isRtf = text.trimStart().startsWith("{\\rtf");
  const src = isRtf ? text.replace(/[\r\n]+/g, "") : text;

  const out: ReactNode[] = [];
  let italic = false;
  let bold = false;
  let red = false;
  let note = false;
  let pendingBreak = false;
  let depth = 0;
  let skipDepth = -1;
  let starPending = false;
  let pict: PictState | null = null;
  const stack: { italic: boolean; bold: boolean }[] = [];

  const emit = (t: string, key: number) => {
    if (!t || note || skipDepth >= 0) return;
    if (pendingBreak) {
      if (out.length) out.push(<br key={`b${key}`} />);
      pendingBreak = false;
    }
    const cls = `${italic ? "italic " : ""}${bold ? "font-bold " : ""}${red ? "text-red-400" : ""}`;
    out.push(<span key={key} className={cls}>{t}</span>);
  };

  const finishPict = (key: number) => {
    const p = pict;
    pict = null;
    if (!p || note || skipDepth >= 0) return;
    if (p.mime && p.hex) {
      out.push(
        <img
          key={`i${key}`}
          src={hexToDataUrl(p.hex, p.mime)}
          alt=""
          className="block my-3 max-w-full h-auto rounded"
        />
      );
    } else {
      out.push(
        <span key={`i${key}`} className="text-zinc-500 italic">[imagen no compatible]</span>
      );
    }
  };

  src.split(TOKEN).forEach((part, i) => {
    if (!part) return;
    const wasStar = starPending;
    starPending = false;

    if (part.startsWith("<") && /^<\/?[A-Za-z]+\d*>$/.test(part)) {
      const m = part.match(/^<(\/?)([A-Za-z]+)(\d*)>$/)!;
      const [, close, tag, num] = m;
      if (close) {
        if (tag === "i" || tag === "em") italic = false;
        else if (tag === "b" || tag === "strong") bold = false;
        return;
      }
      switch (tag) {
        case "FI": case "i": case "em": italic = true; break;
        case "Fi": italic = false; break;
        case "b": case "strong": bold = true; break;
        case "FR": red = true; break;
        case "Fr": red = false; break;
        case "RF": note = true; break;
        case "Rf": note = false; break;
        case "CM": case "br": case "p": pendingBreak = true; break;
        case "WG":
        case "WH":
          if (!note && skipDepth < 0 && num) {
            const code = `${tag[1]}${num}`;
            out.push(
              <sup key={i}>
                <button
                  className="text-sky-400 text-xs ml-0.5 hover:underline"
                  onClick={() => onStrong?.(code)}
                >
                  {code}
                </button>
              </sup>
            );
          }
          break;
        default: break;
      }
      return;
    }

    if (part === "{") {
      stack.push({ italic, bold });
      depth++;
      return;
    }
    if (part === "}") {
      if (pict && depth === pict.depth) finishPict(i);
      const s = stack.pop();
      if (s) {
        italic = s.italic;
        bold = s.bold;
      }
      if (skipDepth === depth) skipDepth = -1;
      depth = Math.max(0, depth - 1);
      return;
    }
    if (part === "\\*") {
      starPending = true;
      return;
    }
    if (part.startsWith("\\'")) {
      if (!pict) emit(cp1252.decode(new Uint8Array([parseInt(part.slice(2), 16)])), i);
      return;
    }
    if (/^\\u-?\d+/.test(part)) {
      const n = parseInt(part.slice(2), 10);
      if (!pict) emit(String.fromCharCode(n < 0 ? n + 65536 : n), i);
      return;
    }
    if (/^\\[-_~]$/.test(part)) {
      // \- guion opcional (se omite), \~ espacio duro, \_ guion duro
      if (!pict && part[1] !== "-") emit(part[1] === "~" ? " " : "-", i);
      return;
    }
    if (/^\\[\\{}]$/.test(part)) {
      if (!pict) emit(part[1], i);
      return;
    }
    if (part.startsWith("\\")) {
      const m = part.match(/^\\([a-zA-Z]+)(-?\d+)?/);
      if (!m) return;
      const [, name, num] = m;
      if (wasStar) {
        // {\*\algo ...} = grupo opcional: se omite, salvo \shppict (contiene la imagen).
        if (name !== "shppict" && depth > 0 && skipDepth < 0) skipDepth = depth;
        return;
      }
      if (name === "pict") pict = { depth, mime: null, hex: "" };
      else if (pict && PICT_MIME.has(name)) pict.mime = PICT_MIME.get(name) ?? null;
      else if (pict && PICT_UNSUPPORTED.test(name)) pict.mime = null;
      else if (name === "par" || name === "line") pendingBreak = true;
      else if (name === "tab") emit(" ", i);
      else if (name === "i") italic = num !== "0";
      else if (name === "b") bold = num !== "0";
      else if (SKIP_GROUPS.has(name) && depth > 0 && skipDepth < 0) skipDepth = depth;
      return;
    }

    if (skipDepth >= 0) return;
    if (pict) {
      pict.hex += part;
      return;
    }
    emit(part, i);
  });

  return out;
}
