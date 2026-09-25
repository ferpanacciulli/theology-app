import lightUrl from "flexlayout-react/style/light.css?url";
import darkUrl from "flexlayout-react/style/dark.css?url";

export type Theme = "light" | "dark";
const KEY = "theme";

export function getInitialTheme(): Theme {
  try {
    const s = localStorage.getItem(KEY);
    if (s === "light" || s === "dark") return s;
  } catch {
    /* sin almacenamiento */
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  let link = document.getElementById("fl-theme") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = "fl-theme";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = theme === "light" ? lightUrl : darkUrl;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#fffdf8" : "#18181b");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignorar */
  }
}
