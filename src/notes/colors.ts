// Los primeros 6 son los originales: no se les cambia la key, para no perder
// el color de lo que ya esté subrayado. Los otros 6 se agregaron después.
export const HIGHLIGHT_COLORS = [
  { key: "yellow", hex: "#facc15", defaultLabel: "Amarillo" },
  { key: "orange", hex: "#fb923c", defaultLabel: "Naranja" },
  { key: "red", hex: "#f87171", defaultLabel: "Rojo" },
  { key: "pink", hex: "#f472b6", defaultLabel: "Rosa" },
  { key: "fuchsia", hex: "#e879f9", defaultLabel: "Fucsia" },
  { key: "purple", hex: "#c084fc", defaultLabel: "Violeta" },
  { key: "indigo", hex: "#818cf8", defaultLabel: "Índigo" },
  { key: "blue", hex: "#60a5fa", defaultLabel: "Azul" },
  { key: "cyan", hex: "#22d3ee", defaultLabel: "Celeste" },
  { key: "teal", hex: "#2dd4bf", defaultLabel: "Turquesa" },
  { key: "green", hex: "#4ade80", defaultLabel: "Verde" },
  { key: "lime", hex: "#a3e635", defaultLabel: "Lima" },
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
