import { getDefaultVoiceIds, type DebateVoiceIds } from "./voice-catalog";

const fishStreamTimeoutMs = 10 * 60_000;
// ponytail: 180 spoken words per request keeps long episodes below Fish's socket ceiling; tune after production timing data.
const fishInputChunkWordLimit = 180;

export function parseFishAudioEvent(data: string) {
  const event = JSON.parse(data) as {
    audio_base64?: unknown;
    message?: unknown;
    status?: unknown;
  };

  if (
    typeof event.message === "string" &&
    typeof event.status === "number" &&
    event.status >= 400
  ) {
    throw new Error(`Fish Audio streaming error: ${event.message}`);
  }

  if (typeof event.audio_base64 !== "string") return null;
  const audio = Buffer.from(event.audio_base64, "base64");
  return audio.length > 0 ? audio : null;
}

async function assertVoiceAvailable(apiKey: string, id: string) {
  const response = await fetch(`https://api.fish.audio/model/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Fish Audio voice ${id} is not available.`);
  }
}

export function splitFishAudioText(
  text: string,
  maxWords = fishInputChunkWordLimit,
) {
  const segments = text.match(/<\|speaker:\d+\|>[\s\S]*?(?=<\|speaker:\d+\|>|$)/g) ?? [];
  if (segments.length === 0) {
    throw new Error("Fish Audio input is missing speaker turns.");
  }

  const chunks: string[] = [];
  let current = "";
  let currentWords = 0;

  for (const segment of segments) {
    const segmentWords = segment
      .replace(/<\|speaker:\d+\|>/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    if (current && currentWords + segmentWords > maxWords) {
      chunks.push(current);
      current = "";
      currentWords = 0;
    }

    current += segment;
    currentWords += segmentWords;
  }

  if (current) chunks.push(current);
  return chunks;
}

async function synthesizeFishAudioChunkOnce(
  text: string,
  apiKey: string,
  voiceIds: readonly string[],
  model: string,
) {
  const response = await fetch("https://api.fish.audio/v1/tts/stream/with-timestamp", {
    method: "POST",
    signal: AbortSignal.timeout(fishStreamTimeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
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
      chunk_length: 300,
      normalize: true,
      format: "mp3",
      sample_rate: 44_100,
      mp3_bitrate: 128,
      latency: "balanced",
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

  if (!response.body) {
    throw new Error("Fish Audio streaming response had no body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: Buffer[] = [];
  let buffer = "";

  const consumeEvent = (event: string) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");

    if (!data || data === "[DONE]") return;
    const audio = parseFishAudioEvent(data);
    if (audio) chunks.push(audio);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    events.forEach(consumeEvent);
    if (done) break;
  }
  if (buffer.trim()) consumeEvent(buffer);

  const audio = Buffer.concat(chunks);
  if (audio.length < 1_024) {
    throw new Error("Fish Audio returned an unexpectedly small MP3.");
  }

  return audio;
}

async function synthesizeFishAudioChunk(
  text: string,
  apiKey: string,
  voiceIds: readonly string[],
  model: string,
) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await synthesizeFishAudioChunkOnce(text, apiKey, voiceIds, model);
    } catch (error) {
      if (attempt === 2) throw error;
      console.warn("Fish Audio chunk failed; retrying once", {
        message: error instanceof Error ? error.message : String(error),
      });
      await Bun.sleep(1_000);
    }
  }

  throw new Error("Fish Audio chunk synthesis failed.");
}

export async function synthesizeDebatePreview(
  text: string,
  outputPath: string,
  voiceIds: DebateVoiceIds = getDefaultVoiceIds(),
) {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) {
    throw new Error("FISH_API_KEY is not configured.");
  }

  await Promise.all(voiceIds.map((id) => assertVoiceAvailable(apiKey, id)));

  const model = process.env.FISH_TTS_MODEL ?? "s2.1-pro-free";
  const chunks = splitFishAudioText(text);
  const audioChunks: Buffer[] = [];
  for (const chunk of chunks) {
    audioChunks.push(await synthesizeFishAudioChunk(chunk, apiKey, voiceIds, model));
  }

  const audio = Buffer.concat(audioChunks);
  await Bun.write(outputPath, audio);
  return { audioBytes: audio.byteLength, model, requestTexts: chunks };
}
