import { useEffect, useState } from "react";

export const speechAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Puntaje de "qué tan natural suena" una voz, según su nombre y su idioma.
 * Los navegadores traen voces gratis y sin instalar nada: las de Edge ("Natural"),
 * las de Chrome ("Google") y las de Apple ("Premium", "Siri") suenan bastante mejor
 * que las básicas del sistema. Se prefiere español latinoamericano.
 */
function score(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  const l = v.lang.toLowerCase().replace("_", "-");
  let s = 0;
  if (n.includes("natural") || n.includes("neural")) s += 100;
  if (n.includes("premium") || n.includes("enhanced") || n.includes("siri")) s += 70;
  if (n.includes("online")) s += 40;
  if (n.includes("google")) s += 40;
  if (n.includes("espeak") || n.includes("compact")) s -= 200;
  if (l === "es-ar") s += 30;
  else if (l === "es-mx" || l === "es-us" || l === "es-419") s += 20;
  else if (l === "es-es") s += 5;
  return s;
}

function readVoices(): SpeechSynthesisVoice[] {
  if (!speechAvailable) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("es"))
    .sort((a, b) => score(b) - score(a));
}

/** Voces en español disponibles, de la más natural a la menos. Se actualiza cuando el navegador las carga. */
export function useSpanishVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(readVoices);
  useEffect(() => {
    if (!speechAvailable) return;
    const update = () => setVoices(readVoices());
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  return voices;
}

const VOICE_KEY = "teologia:voice";

export function savedVoiceURI(): string {
  try {
    return localStorage.getItem(VOICE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveVoiceURI(uri: string) {
  try {
    localStorage.setItem(VOICE_KEY, uri);
  } catch {
    /* sin almacenamiento */
  }
}

/** La voz elegida por la persona, o la mejor disponible si no eligió ninguna. */
export function pickVoice(voices: SpeechSynthesisVoice[], uri: string): SpeechSynthesisVoice | undefined {
  return voices.find((v) => v.voiceURI === uri) ?? voices[0];
}
