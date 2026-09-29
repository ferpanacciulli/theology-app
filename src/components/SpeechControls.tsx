import { useEffect, useMemo, useRef, useState } from "react";
import { speechAvailable, useSpanishVoices, savedVoiceURI, saveVoiceURI, pickVoice } from "../bible/speech";

interface SpeechVerse {
  verse: number;
  text: string;
}

interface Props {
  /** Todos los versículos del capítulo actual, en orden. */
  allVerses: SpeechVerse[];
  /** Versículos seleccionados. Si es más de uno, se leen solo esos; si es uno, se sigue leyendo hasta el final del capítulo. */
  selection: number[];
  onVerseStart: (verse: number) => void;
  onDone?: () => void;
  /** Cambia cuando cambia el capítulo o la versión activa: corta la lectura en curso. */
  resetKey: string;
}

function SpeechControls({ allVerses, selection, onVerseStart, onDone, resetKey }: Props) {
  const voices = useSpanishVoices();
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const [voiceURI, setVoiceURI] = useState(savedVoiceURI());
  const indexRef = useRef(0);
  const rateRef = useRef(1);
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const onVerseStartRef = useRef(onVerseStart);
  const onDoneRef = useRef(onDone);

  const playlist = useMemo(() => {
    if (selection.length > 1) return allVerses.filter((v) => selection.includes(v.verse));
    const from = selection[0];
    const i = allVerses.findIndex((v) => v.verse === from);
    return i >= 0 ? allVerses.slice(i) : allVerses;
  }, [allVerses, selection]);
  const playlistRef = useRef(playlist);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);
  useEffect(() => {
    onVerseStartRef.current = onVerseStart;
    onDoneRef.current = onDone;
  }, [onVerseStart, onDone]);
  useEffect(() => {
    voiceRef.current = pickVoice(voices, voiceURI);
  }, [voices, voiceURI]);

  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Si cambia la selección mientras está detenido, la próxima reproducción arranca de cero.
  useEffect(() => {
    if (state === "idle") indexRef.current = 0;
  }, [playlist, state]);

  useEffect(() => {
    return () => {
      if (speechAvailable) window.speechSynthesis.cancel();
    };
  }, []);

  function speakFrom(i: number) {
    const list = playlistRef.current;
    if (i >= list.length) {
      indexRef.current = 0;
      setState("idle");
      onDoneRef.current?.();
      return;
    }
    const v = list[i];
    if (!v.text.trim()) {
      speakFrom(i + 1);
      return;
    }
    const u = new SpeechSynthesisUtterance(v.text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.lang = voiceRef.current?.lang ?? "es-ES";
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
    indexRef.current = 0;
    setState("playing");
    speakFrom(0);
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

  function changeVoice(uri: string) {
    setVoiceURI(uri);
    saveVoiceURI(uri);
  }

  if (!speechAvailable) return null;

  const btn = "bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors";
  const select = "bg-zinc-800 hover:bg-zinc-700 px-2 py-2 rounded-lg text-xs outline-none max-w-[9rem]";

  return (
    <div className="flex items-center gap-1.5">
      {state === "playing" ? (
        <button onClick={pause} title="Pausar" className={btn}>⏸️</button>
      ) : (
        <button
          onClick={play}
          title={selection.length > 1 ? `Escuchar los versículos ${selection[0]}–${selection[selection.length - 1]}` : "Escuchar desde este versículo"}
          className={btn}
        >
          🔊
        </button>
      )}
      {state !== "idle" && (
        <button onClick={stop} title="Detener" className={btn}>⏹️</button>
      )}
      <select value={rate} onChange={(e) => setRate(Number(e.target.value))} title="Velocidad" className={select}>
        <option value={0.75}>0.75×</option>
        <option value={1}>1×</option>
        <option value={1.25}>1.25×</option>
        <option value={1.5}>1.5×</option>
        <option value={1.75}>1.75×</option>
        <option value={2}>2×</option>
      </select>
      {voices.length > 0 && (
        <select value={voiceURI || voices[0]?.voiceURI} onChange={(e) => changeVoice(e.target.value)} title="Voz" className={select}>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default SpeechControls;
