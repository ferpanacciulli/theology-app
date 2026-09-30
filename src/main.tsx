import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, getInitialTheme } from "./theme";
import { applyFontScale, getFontScale } from "./fontSize";

applyTheme(getInitialTheme());
applyFontScale(getFontScale());

// App instalable y con caché sin conexión (solo en producción).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
