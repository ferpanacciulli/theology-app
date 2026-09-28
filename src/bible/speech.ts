let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}

export const speechAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

if (speechAvailable) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/** La primera voz en español instalada en el navegador, si hay alguna. */
export function spanishVoice(): SpeechSynthesisVoice | undefined {
  return voices.find((v) => v.lang.toLowerCase().startsWith("es"));
}
