export const freeGenerationLimit = 3;
export const freePodcastDurations = [1, 3, 5] as const;

export function toGenerationQuota(used: number) {
  const safeUsed = Math.min(Math.max(used, 0), freeGenerationLimit);
  return {
    limit: freeGenerationLimit,
    used: safeUsed,
    remaining: freeGenerationLimit - safeUsed,
    allowedDurations: freePodcastDurations,
  };
}
