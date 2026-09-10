import { SITE_KIND_PROFILES, type SiteKindId } from "@/lib/site-kinds";

export const SITE_KINDS = SITE_KIND_PROFILES.map((profile) => ({
  id: profile.id,
  family: profile.family,
}));

export const SITE_TEMPLATES = [
  { id: "storefront", label: "Storefront", vibe: "Photo-forward one pager" },
  { id: "board", label: "Menu board", vibe: "Hours and offer first" },
  { id: "studio", label: "Studio", vibe: "Quiet, appointment feel" },
] as const;

export type SiteKind = SiteKindId;
export type SiteTemplateId = (typeof SITE_TEMPLATES)[number]["id"];

export function isSiteKind(value: string): value is SiteKind {
  return SITE_KINDS.some((item) => item.id === value);
}

export function isSiteTemplate(value: string): value is SiteTemplateId {
  return SITE_TEMPLATES.some((item) => item.id === value);
}
