export type PassPlatform = "apple" | "google" | "demo";

export type StampEventType = "stamp" | "redeem" | "adjust";

export type CampaignChannel = "wallet" | "email";

export type CampaignStatus = "draft" | "sending" | "sent" | "failed";

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
