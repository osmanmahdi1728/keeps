export const SITE_KINDS = [
  { id: "cafe", label: "Café" },
  { id: "bakery", label: "Bakery" },
  { id: "salon", label: "Salon / nails" },
  { id: "barber", label: "Barber" },
  { id: "juice", label: "Juice / tea" },
] as const;

export const SITE_TEMPLATES = [
  { id: "storefront", label: "Storefront", vibe: "Photo-forward one pager" },
  { id: "board", label: "Menu board", vibe: "Hours and offer first" },
  { id: "studio", label: "Studio", vibe: "Quiet, appointment feel" },
] as const;

export type SiteKind = (typeof SITE_KINDS)[number]["id"];
export type SiteTemplateId = (typeof SITE_TEMPLATES)[number]["id"];

export function isSiteKind(value: string): value is SiteKind {
  return SITE_KINDS.some((item) => item.id === value);
}

export function isSiteTemplate(value: string): value is SiteTemplateId {
  return SITE_TEMPLATES.some((item) => item.id === value);
}

export function draftSiteCopy(input: {
  name: string;
  kind: string;
  neighborhood: string;
  hours: string;
  knownFor: string;
  rewardLabel: string;
  stampsRequired: number;
}): { tagline: string; about: string } {
  const place = input.neighborhood.trim() || "the neighborhood";
  const craft = input.knownFor.trim() || defaultKnownFor(input.kind);
  const tagline = {
    cafe: `Coffee, people, and a card that actually comes back.`,
    bakery: `Warm bread. Warm regulars.`,
    salon: `Look after your people. We’ll look after the repeats.`,
    barber: `The tenth cut should feel like a win.`,
    juice: `Come back thirsty. Leave with a stamp.`,
  }[input.kind] ?? `A small shop with a reason to return.`;

  const about = `${input.name} is in ${place}. ${craft} Collect ${input.stampsRequired} stamps for ${input.rewardLabel.toLowerCase()}. ${input.hours}.`;
  return { tagline, about };
}

function defaultKnownFor(kind: string): string {
  switch (kind) {
    case "cafe":
      return "We’re known for espresso that doesn’t rush you.";
    case "bakery":
      return "We’re known for the morning loaf and the 4pm leftover luck.";
    case "salon":
      return "We’re known for quiet chairs and honest recommendations.";
    case "barber":
      return "We’re known for a clean line and a regular chair.";
    case "juice":
      return "We’re known for cold drinks and a counter that remembers you.";
    default:
      return "We’re known for treating regulars like regulars.";
  }
}
