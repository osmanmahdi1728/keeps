import { createHash } from "node:crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 90 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenExpiresAt(now = Date.now()): Date {
  return new Date(now + TOKEN_TTL_MS);
}

export function isResetCooldownActive(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() < RESEND_COOLDOWN_MS;
}

export function isResetTokenShape(token: string): boolean {
  return /^[a-f0-9]{48}$/.test(token);
}