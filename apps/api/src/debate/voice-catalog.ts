// Curated Fish Audio voices and the saved/default pair used for debate synthesis.
export const voiceAOptions = [
  { id: "7ff4ca1837d745ea973471a8fba735e4", name: "Sarah" },
  { id: "8d21b053e2804e2a890e1cf62f267b6f", name: "Verity" },
  { id: "b347db033a6549378b48d00acb0d06cd", name: "Selene" },
  { id: "e9b134e4c0b547a3894793be502314f1", name: "Jasphina" },
  { id: "a325095a7cc049cebf39b1de9464fc73", name: "Emily" },
] as const;

export const voiceBOptions = [
  { id: "77974fed34614080a505a797bb96357b", name: "Tuck Pro" },
  { id: "bf322df2096a46f18c579d0baa36f41d", name: "Adrian" },
  { id: "536d3a5e000945adb7038665781a4aca", name: "Ethan" },
  { id: "f48d143a59a946ab87c0130fd081f349", name: "Polo" },
  { id: "802e3bc2b27e49c2995d23ef70e6ac89", name: "Energetic Male" },
] as const;

export type DebateVoiceIds = [string, string];

function includesVoice(options: readonly { id: string }[], id: string) {
  return options.some((option) => option.id === id);
}

export function isVoiceAId(id: string) {
  return includesVoice(voiceAOptions, id);
}

export function isVoiceBId(id: string) {
  return includesVoice(voiceBOptions, id);
}

export function getDefaultVoiceIds(): DebateVoiceIds {
  const voiceAId = process.env.FISH_VOICE_A_ID ?? voiceAOptions[0].id;
  const voiceBId = process.env.FISH_VOICE_B_ID ?? voiceBOptions[0].id;

  if (!isVoiceAId(voiceAId) || !isVoiceBId(voiceBId)) {
    throw new Error(
      "FISH_VOICE_A_ID and FISH_VOICE_B_ID must match the configured voice catalog.",
    );
  }

  return [voiceAId, voiceBId];
}

export function resolveVoiceIds(settings?: {
  voiceAId?: string | null;
  voiceBId?: string | null;
}): DebateVoiceIds {
  const defaults = getDefaultVoiceIds();
  const voiceAId = settings?.voiceAId ?? defaults[0];
  const voiceBId = settings?.voiceBId ?? defaults[1];

  if (!isVoiceAId(voiceAId) || !isVoiceBId(voiceBId)) {
    throw new Error("Saved debate voices are no longer available.");
  }

  return [voiceAId, voiceBId];
}
