import { useEffect, useRef, useState } from "react";
import { speechAvailable, spanishVoice } from "../bible/speech";

interface SpeechVerse {
  verse: number;
  text: string;
}

interface Props {
  verses: SpeechVerse[];
  onVerseStart: (verse: number) => void;
  /** Cambia cuando cambia el capítulo o la versión: corta la lectura en curso. */
  resetKey: string;
}

function SpeechControls({ verses, onVerseStart, resetKey }: Props) {
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const indexRef = useRef(0);
  const rateRef = useRef(1);
  const versesRef = useRef(verses);
  const onVerseStartRef = useRef(onVerseStart);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  useEffect(() => {
    versesRef.current = verses;
  }, [verses]);
  useEffect(() => {
    onVerseStartRef.current = onVerseStart;
  }, [onVerseStart]);

  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (speechAvailable) window.speechSynthesis.cancel();
    };
  }, []);

  function speakFrom(i: number) {
    const list = versesRef.current;
    if (i >= list.length) {
      indexRef.current = 0;
      setState("idle");
      return;
    }
    const v = list[i];
    if (!v.text.trim()) {
      speakFrom(i + 1);
      return;
    }
    const u = new SpeechSynthesisUtterance(v.text);
    const voice = spanishVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "es-ES";
    u.rate = rateRef.current;
    u.onstart = () => onVerseStartRef.current(v.verse);
    u.onend = () => {
      indexRef.current = i + 1;
      speakFrom(i + 1);
    };
    u.onerror = () => setState("idle");
    window.speechSynthesis.speak(u);
  }

  function play() {
    if (state === "paused") {
      window.speechSynthesis.resume();
      setState("playing");
      return;
    }
    window.speechSynthesis.cancel();
    setState("playing");
    speakFrom(indexRef.current);
  }

  function pause() {
    window.speechSynthesis.pause();
    setState("paused");
  }

  function stop() {
    window.speechSynthesis.cancel();
    indexRef.current = 0;
    setState("idle");
  }

  if (!speechAvailable) return null;

  const btn = "bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors";

  return (
    <div className="flex items-center gap-1.5">
      {state === "playing" ? (
        <button onClick={pause} title="Pausar" className={btn}>⏸️</button>
      ) : (
        <button onClick={play} title="Escuchar este capítulo" className={btn}>🔊</button>
      )}
      {state !== "idle" && (
        <button onClick={stop} title="Detener" className={btn}>⏹️</button>
      )}
      <select
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
        title="Velocidad"
        className="bg-zinc-800 hover:bg-zinc-700 px-2 py-2 rounded-lg text-xs outline-none"
      >
        <option value={0.75}>0.75×</option>
        <option value={1}>1×</option>
        <option value={1.25}>1.25×</option>
        <option value={1.5}>1.5×</option>
      </select>
    </div>
  );
}

export default SpeechControls;
