import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

export function passDownloadTokenMatches(
  expected: string,
  provided: string,
): boolean {
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return (
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes)
  );
}
