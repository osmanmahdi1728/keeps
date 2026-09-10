import { createDefaultSiteSections } from "@/lib/site-kinds";
import {
  SITE_DATA_VERSION,
  parseSiteMenuItems,
  parseSiteSections,
  siteMediaSchema,
  siteSectionSchema,
  type SiteMenuItem,
  type SiteMedia,
  type SiteSection,
  type SiteSectionContent,
} from "@/lib/site-sections";
import { assertNever } from "@/lib/types";

export type LegacySiteMerchant = {
  name: string;
  siteKind?: string;
  neighborhood: string;
  hours: string;
  knownFor: string;
  instagram: string;
  tagline: string;
  about: string;
  program?: {
    rewardLabel: string;
    stampsRequired: number;
  } | null;
};

export type StoredSiteSection = {
  key: string;
  position: number;
  enabled: boolean;
  type: string;
  content: unknown;
};

export type StoredSiteMenuItem = {
  key: string;
  name: unknown;
  description: unknown;
  category: unknown;
  priceCents: number | null;
  currency: string;
  position: number;
  available: boolean;
};

export type StoredSiteMedia = {
  key: string;
  kind: string;
  url: string;
  alt: unknown;
  position: number;
  width: number | null;
  height: number | null;
  metadata: unknown;
};

export type AssembledSiteData = {
  version: typeof SITE_DATA_VERSION;
  source: "sections" | "legacy";
  sections: SiteSection[];
  menuItems: SiteMenuItem[];
};

function mergeLegacyContent(
  content: SiteSectionContent,
  merchant: LegacySiteMerchant,
): SiteSectionContent {
  switch (content.type) {
    case "hero":
      return {
        ...content,
        title: merchant.tagline
          ? { en: merchant.tagline, fr: content.title.fr }
          : content.title,
        body: merchant.about
          ? { en: merchant.about, fr: content.body.fr }
          : content.body,
      };
    case "hours":
      return {
        ...content,
        entries: [
          {
            day: { en: "Every day", fr: "Tous les jours" },
            hours: { en: merchant.hours, fr: merchant.hours },
          },
        ],
      };
    case "contact":
      return {
        ...content,
        instagram: merchant.instagram || undefined,
      };
    case "about":
    case "menu":
    case "loyalty":
      return content;
    default:
      return assertNever(content);
  }
}

export function assembleLegacySiteSections(
  merchant: LegacySiteMerchant,
): SiteSection[] {
  const defaults = createDefaultSiteSections({
    merchantName: merchant.name,
    siteKind: merchant.siteKind,
    neighborhood: merchant.neighborhood,
    knownFor: merchant.knownFor,
    hours: merchant.hours,
    rewardLabel: merchant.program?.rewardLabel,
    stampsRequired: merchant.program?.stampsRequired,
    instagram: merchant.instagram,
  });

  return defaults.map((section) =>
    siteSectionSchema.parse({
      ...section,
      content: mergeLegacyContent(section.content, merchant),
    }),
  );
}

export function parseStoredSiteSections(
  sections: StoredSiteSection[],
): SiteSection[] {
  return parseSiteSections(
    sections
      .map((section) => {
        const content = siteSectionSchema.shape.content.parse(section.content);
        if (content.type !== section.type) {
          throw new Error(
            `Section "${section.key}" type does not match its content discriminator`,
          );
        }
        return {
          key: section.key,
          position: section.position,
          enabled: section.enabled,
          content,
        };
      })
      .sort((first, second) => first.position - second.position),
  );
}

export function parseStoredSiteMenuItems(
  items: StoredSiteMenuItem[],
): SiteMenuItem[] {
  return parseSiteMenuItems(
    items
      .map((item) => ({
        key: item.key,
        name: item.name,
        description: item.description ?? undefined,
        category: item.category ?? undefined,
        priceCents: item.priceCents,
        currency: item.currency,
        position: item.position,
        available: item.available,
      }))
      .sort((first, second) => first.position - second.position),
  );
}

export function parseStoredSiteMedia(
  items: StoredSiteMedia[],
  options: { includePending?: boolean } = {},
): SiteMedia[] {
  return items
    .flatMap((item) => {
      const parsed = siteMediaSchema.safeParse(
        item.kind === "video"
          ? {
              kind: "video",
              key: item.key,
              url: item.url,
              title: item.alt,
              position: item.position,
            }
          : {
              kind: "image",
              key: item.key,
              url: item.url,
              alt: item.alt,
              position: item.position,
              width: item.width ?? undefined,
              height: item.height ?? undefined,
              metadata: item.metadata ?? undefined,
            },
      );
      if (
        !parsed.success ||
        (!options.includePending &&
          parsed.data.kind === "image" &&
          parsed.data.metadata?.source === "google-pending")
      ) {
        return [];
      }
      return [parsed.data];
    })
    .sort((first, second) => first.position - second.position);
}

export function assembleSiteData(input: {
  merchant: LegacySiteMerchant;
  sections: StoredSiteSection[];
  menuItems: StoredSiteMenuItem[];
}): AssembledSiteData {
  if (input.sections.length === 0) {
    return {
      version: SITE_DATA_VERSION,
      source: "legacy",
      sections: assembleLegacySiteSections(input.merchant),
      menuItems: [],
    };
  }

  return {
    version: SITE_DATA_VERSION,
    source: "sections",
    sections: parseStoredSiteSections(input.sections),
    menuItems: parseStoredSiteMenuItems(input.menuItems),
  };
}
