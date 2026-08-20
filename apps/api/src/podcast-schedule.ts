export function getPodcastSchedule(
  value: string | undefined,
  now = new Date(),
) {
  const scheduledFor = value ? new Date(value) : null;
  const isScheduled = scheduledFor !== null && scheduledFor > now;

  return {
    scheduledFor,
    status: isScheduled ? "scheduled" : "queued",
    progress: isScheduled ? 0 : 4,
    shouldStart: !isScheduled,
  } as const;
}
