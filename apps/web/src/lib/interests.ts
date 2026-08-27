/** Splits a comma-separated interest list while preserving the first unique spelling. */
export function parseInterestTopics(value: string) {
  const topics = new Map<string, string>();

  for (const part of value.split(",")) {
    const topic = part.trim();
    const key = topic.toLocaleLowerCase();
    if (topic && !topics.has(key)) topics.set(key, topic);
  }

  return [...topics.values()];
}
