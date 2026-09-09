export type PassPlatform = "apple" | "google" | "demo";

export type StampEventType = "stamp" | "redeem" | "adjust";

export type CampaignChannel = "wallet" | "email";

export type CampaignStatus = "draft" | "sending" | "sent" | "failed";

export type StampCard = {
  serial: string;
  name: string;
  email: string;
  stampCount: number;
  stampsRequired: number;
  rewardLabel: string;
  hasNewsletterOffer: boolean;
};

export type StampActionResult = { error: string } | StampCard;

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
