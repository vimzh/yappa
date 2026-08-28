export const freeGenerationLimit = 3;
export const freePodcastDurations = [1, 3, 5] as const;

export function toGenerationQuota(used: number, unlimited = false) {
  if (unlimited) {
    return {
      unlimited: true,
      limit: null,
      used,
      remaining: null,
      allowedDurations: freePodcastDurations,
    };
  }

  const safeUsed = Math.min(Math.max(used, 0), freeGenerationLimit);
  return {
    unlimited: false,
    limit: freeGenerationLimit,
    used: safeUsed,
    remaining: freeGenerationLimit - safeUsed,
    allowedDurations: freePodcastDurations,
  };
}
