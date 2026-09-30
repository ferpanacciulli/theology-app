import { useState } from "react";
import { applyFontScale, clampFontScale, getFontScale, FONT_STEP } from "../fontSize";

function FontSizeControl() {
  const [scale, setScale] = useState(getFontScale);

  function change(delta: number) {
    const next = clampFontScale(scale + delta);
    setScale(next);
    applyFontScale(next);
  }

  const btn = "w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors";

  return (
    <div className="flex items-center gap-1" title="Tamaño de letra de la Biblia">
      <button onClick={() => change(-FONT_STEP)} className={`${btn} text-xs`}>A-</button>
      <button onClick={() => change(FONT_STEP)} className={`${btn} text-base`}>A+</button>
    </div>
  );
}

export default FontSizeControl;
