const KEY = "teologia:fontScale";
export const FONT_MIN = 0.8;
export const FONT_MAX = 1.6;
export const FONT_STEP = 0.1;
export const FONT_DEFAULT = 1;

export function getFontScale(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return v && v >= FONT_MIN && v <= FONT_MAX ? v : FONT_DEFAULT;
  } catch {
    return FONT_DEFAULT;
  }
}

export function clampFontScale(v: number): number {
  return Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(v * 100) / 100));
}

/** Aplica la escala como variable CSS, para que el texto bíblico la use. */
export function applyFontScale(scale: number) {
  document.documentElement.style.setProperty("--reading-scale", String(scale));
  try {
    localStorage.setItem(KEY, String(scale));
  } catch {
    /* ignorar */
  }
}
