export type ByteRange = { start: number; end: number };

export function parseByteRange(
  value: string | undefined,
  fileSize: number,
): ByteRange | null | "invalid" {
  if (!value) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2]) || fileSize <= 0) return "invalid";

  const requestedStart = match[1] ? Number(match[1]) : undefined;
  const requestedEnd = match[2] ? Number(match[2]) : undefined;
  const isSuffixRange = requestedStart === undefined;
  const start = isSuffixRange
    ? Math.max(0, fileSize - (requestedEnd ?? fileSize))
    : requestedStart;
  const end = isSuffixRange
    ? fileSize - 1
    : Math.min(requestedEnd ?? fileSize - 1, fileSize - 1);

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
    return "invalid";
  }

  if (start < 0 || start > end || start >= fileSize) return "invalid";
  return { start, end };
}
