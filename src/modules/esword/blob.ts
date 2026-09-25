import { unzlibSync } from "fflate";

const utf8 = new TextDecoder("utf-8", { fatal: true });
const cp1252 = new TextDecoder("windows-1252");

function decode(d: Uint8Array): string {
  try {
    return utf8.decode(d);
  } catch {
    return cp1252.decode(d);
  }
}

/**
 * Texto de una celda que puede ser TEXT o BLOB. Los BLOB de e-Sword pueden venir
 * como [uint32 LE largo][zlib]. Devuelve null si el contenido no es legible
 * (por ejemplo, módulos cifrados por e-Sword).
 */
export function blobToText(v: unknown): string | null {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (!(v instanceof Uint8Array)) return String(v);

  if (v.length > 5 && v[4] === 0x78) {
    try {
      const d = unzlibSync(v.subarray(4));
      const n = new DataView(v.buffer, v.byteOffset, v.byteLength).getUint32(0, true);
      if (d.length === n) return decode(d);
    } catch {
      /* no era zlib */
    }
  }
  try {
    return utf8.decode(v);
  } catch {
    return null;
  }
}

const DIB_SIZES = new Set([12, 40, 52, 56, 108, 124]);

/** Detecta JPEG/PNG/GIF/BMP dentro de un BLOB (algunos traen un prefijo de 8 bytes). */
export function sniffImage(b: Uint8Array): { mime: string; data: Uint8Array } | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const max = Math.min(32, b.length - 16);
  for (let o = 0; o < max; o++) {
    if (b[o] === 0xff && b[o + 1] === 0xd8 && b[o + 2] === 0xff)
      return { mime: "image/jpeg", data: b.subarray(o) };
    if (b[o] === 0x89 && b[o + 1] === 0x50 && b[o + 2] === 0x4e && b[o + 3] === 0x47)
      return { mime: "image/png", data: b.subarray(o) };
    if (b[o] === 0x47 && b[o + 1] === 0x49 && b[o + 2] === 0x46 && b[o + 3] === 0x38)
      return { mime: "image/gif", data: b.subarray(o) };
    if (
      b[o] === 0x42 && b[o + 1] === 0x4d &&
      dv.getUint32(o + 6, true) === 0 &&
      DIB_SIZES.has(dv.getUint32(o + 14, true))
    )
      return { mime: "image/bmp", data: b.subarray(o) };
  }
  return null;
}

/** Hex de RTF (\pict) -> data URL. */
export function hexToDataUrl(hex: string, mime: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  const bytes = new Uint8Array(clean.length >> 1);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${mime};base64,${btoa(bin)}`;
}
