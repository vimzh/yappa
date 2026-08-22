// Starts one podcast job through the local API and follows it until completion.
const argumentsList = process.argv.slice(2).filter((argument) => argument !== "--");
const durationIndex = argumentsList.indexOf("--duration");
const durationMinutes = durationIndex >= 0 ? Number(argumentsList[durationIndex + 1]) : 1;
const topic = argumentsList
  .filter((_, index) => index !== durationIndex && index !== durationIndex + 1)
  .join(" ")
  .trim();

if (!topic) {
  throw new Error(
    'Pass a topic: bun run podcast:generate -- "Should cities ban cars?"',
  );
}

const apiUrl = process.env.API_URL ?? "http://localhost:3101";
const created = await fetch(`${apiUrl}/podcasts`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ topic, durationMinutes, maxIterations: 2 }),
});

if (!created.ok) {
  throw new Error(`API returned ${created.status}: ${await created.text()}`);
}

const podcast = (await created.json()) as {
  id: string;
  status: string;
  progress: number;
};

let lastStatus = "";

while (true) {
  const response = await fetch(`${apiUrl}/podcasts/${podcast.id}`);
  if (!response.ok) {
    throw new Error(`Status request returned ${response.status}.`);
  }

  const current = (await response.json()) as {
    id: string;
    title: string;
    status: string;
    progress: number;
    error: string | null;
    report: unknown;
  };

  const statusLine = `${current.status} (${current.progress}%)`;
  if (statusLine !== lastStatus) {
    console.log(statusLine);
    lastStatus = statusLine;
  }

  if (current.status === "ready") {
    console.log(`Audio: ${apiUrl}/podcasts/${current.id}/audio`);
    console.log(JSON.stringify(current.report, null, 2));
    break;
  }

  if (current.status === "failed") {
    throw new Error(current.error ?? "Podcast generation failed.");
  }

  await Bun.sleep(3_000);
}
