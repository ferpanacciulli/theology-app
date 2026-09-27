export const HIGHLIGHT_COLORS = [
  { key: "yellow", hex: "#facc15", defaultLabel: "Amarillo" },
  { key: "green", hex: "#4ade80", defaultLabel: "Verde" },
  { key: "blue", hex: "#60a5fa", defaultLabel: "Azul" },
  { key: "pink", hex: "#f472b6", defaultLabel: "Rosa" },
  { key: "purple", hex: "#c084fc", defaultLabel: "Violeta" },
  { key: "orange", hex: "#fb923c", defaultLabel: "Naranja" },
] as const;

export type ColorKey = (typeof HIGHLIGHT_COLORS)[number]["key"];

export function colorHex(key: string | null | undefined): string | null {
  return HIGHLIGHT_COLORS.find((c) => c.key === key)?.hex ?? null;
}

/** Color en rgba con transparencia, para usar de fondo detrás del texto. */
export function colorTint(key: string | null | undefined, alpha = 0.18): string | undefined {
  const hex = colorHex(key);
  if (!hex) return undefined;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
