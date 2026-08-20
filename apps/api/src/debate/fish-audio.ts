const defaultVoiceA = "7ff4ca1837d745ea973471a8fba735e4";
const defaultVoiceB = "77974fed34614080a505a797bb96357b";

async function assertVoiceAvailable(apiKey: string, id: string) {
  const response = await fetch(`https://api.fish.audio/model/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Fish Audio voice ${id} is not available.`);
  }
}

export async function synthesizeDebatePreview(text: string, outputPath: string) {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) {
    throw new Error("FISH_API_KEY is not configured.");
  }

  const voiceIds = [
    process.env.FISH_VOICE_A_ID ?? defaultVoiceA,
    process.env.FISH_VOICE_B_ID ?? defaultVoiceB,
  ];
  await Promise.all(voiceIds.map((id) => assertVoiceAvailable(apiKey, id)));

  const model = process.env.FISH_TTS_MODEL ?? "s2.1-pro-free";

  // One request and no automatic retry: this preview must conserve Fish credits.
  const response = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    signal: AbortSignal.timeout(180_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model,
    },
    body: JSON.stringify({
      text,
      reference_id: voiceIds,
      temperature: 0.68,
      top_p: 0.72,
      prosody: {
        speed: 1.02,
        volume: 0,
        normalize_loudness: true,
      },
      chunk_length: 220,
      normalize: true,
      format: "mp3",
      sample_rate: 44_100,
      mp3_bitrate: 128,
      latency: "normal",
      max_new_tokens: 1_024,
      repetition_penalty: 1.2,
      min_chunk_length: 50,
      condition_on_previous_chunks: true,
      early_stop_threshold: 1,
      features: ["quality-guard"],
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(
      `Fish Audio returned ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  const audio = await response.arrayBuffer();
  if (audio.byteLength < 1_024) {
    throw new Error("Fish Audio returned an unexpectedly small MP3.");
  }

  await Bun.write(outputPath, audio);
  return { audioBytes: audio.byteLength, model };
}
