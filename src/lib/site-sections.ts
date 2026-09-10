import { z } from "zod";
import { assertNever } from "@/lib/types";

export const SITE_DATA_VERSION = 2;
export const SITE_LOCALES = ["en", "fr"] as const;

export const localizedTextSchema = z.object({
  en: z.string(),
  fr: z.string(),
});

const actionSchema = z.object({
  label: localizedTextSchema,
  href: z.string().min(1),
});

const heroContentSchema = z.object({
  type: z.literal("hero"),
  eyebrow: localizedTextSchema,
  title: localizedTextSchema,
  body: localizedTextSchema,
  primaryAction: actionSchema.optional(),
  secondaryAction: actionSchema.optional(),
  mediaKey: z.string().optional(),
});

const aboutContentSchema = z.object({
  type: z.literal("about"),
  title: localizedTextSchema,
  body: localizedTextSchema,
  highlights: z.array(localizedTextSchema).default([]),
  mediaKey: z.string().optional(),
});

const menuContentSchema = z.object({
  type: z.literal("menu"),
  title: localizedTextSchema,
  body: localizedTextSchema,
  showPrices: z.boolean().default(true),
});

const hoursContentSchema = z.object({
  type: z.literal("hours"),
  title: localizedTextSchema,
  entries: z
    .array(
      z.object({
        day: localizedTextSchema,
        hours: localizedTextSchema,
      }),
    )
    .default([]),
  note: localizedTextSchema.optional(),
});

// Merchants keep booking and ordering on the tool they already use, so this is the
// one place a shop-owned external link is allowed. Imported and AI-drafted copy may
// never populate it; see the draft validation in `site-ai.ts`.
const bookingSchema = z.object({
  url: z
    .string()
    .url()
    .max(500)
    .refine((value) => value.toLowerCase().startsWith("https://"), {
      message: "Booking links must use https",
    }),
  label: localizedTextSchema.optional(),
});

const contactContentSchema = z.object({
  type: z.literal("contact"),
  title: localizedTextSchema,
  body: localizedTextSchema,
  address: localizedTextSchema.optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  instagram: z.string().optional(),
  mapUrl: z.string().url().optional(),
  booking: bookingSchema.optional(),
});

const loyaltyContentSchema = z.object({
  type: z.literal("loyalty"),
  title: localizedTextSchema,
  body: localizedTextSchema,
  action: actionSchema,
});

export const siteSectionContentSchema = z.discriminatedUnion("type", [
  heroContentSchema,
  aboutContentSchema,
  menuContentSchema,
  hoursContentSchema,
  contactContentSchema,
  loyaltyContentSchema,
]);

export const siteSectionSchema = z.object({
  key: z.string().min(1),
  position: z.number().int().nonnegative(),
  enabled: z.boolean().default(true),
  content: siteSectionContentSchema,
});

export const siteSectionsSchema = z
  .array(siteSectionSchema)
  .superRefine((sections, context) => {
    const keys = new Set<string>();
    for (const [index, section] of sections.entries()) {
      if (keys.has(section.key)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate section key: ${section.key}`,
          path: [index, "key"],
        });
      }
      keys.add(section.key);
    }
  });

export const siteMenuItemSchema = z.object({
  key: z.string().min(1),
  name: localizedTextSchema,
  description: localizedTextSchema.optional(),
  category: localizedTextSchema.optional(),
  priceCents: z.number().int().nonnegative().nullable().default(null),
  currency: z.string().length(3).default("CAD"),
  position: z.number().int().nonnegative(),
  available: z.boolean().default(true),
});

export const siteMenuItemsSchema = z.array(siteMenuItemSchema);

const imageMediaSchema = z.object({
  kind: z.literal("image"),
  key: z.string().min(1),
  url: z.string().min(1),
  alt: localizedTextSchema,
  position: z.number().int().nonnegative().default(0),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  metadata: z
    .object({
      source: z.enum(["upload", "google", "ai", "website"]).optional(),
      sourceUrl: z.string().url().optional(),
      attribution: z
        .array(
          z.object({
            name: z.string(),
            uri: z.string().url().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

const videoMediaSchema = z.object({
  kind: z.literal("video"),
  key: z.string().min(1),
  url: z.string().url(),
  title: localizedTextSchema,
  position: z.number().int().nonnegative().default(0),
  posterUrl: z.string().url().optional(),
});

export const siteMediaSchema = z.discriminatedUnion("kind", [
  imageMediaSchema,
  videoMediaSchema,
]);

export type SiteLocale = (typeof SITE_LOCALES)[number];
export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type SiteBooking = z.infer<typeof bookingSchema>;
export type SiteSectionContent = z.infer<typeof siteSectionContentSchema>;
export type SiteSection = z.infer<typeof siteSectionSchema>;
export type SiteMenuItem = z.infer<typeof siteMenuItemSchema>;
export type SiteMedia = z.infer<typeof siteMediaSchema>;

export function localize(text: LocalizedText, locale: SiteLocale): string {
  return text[locale];
}

export function parseSiteSections(value: unknown): SiteSection[] {
  return siteSectionsSchema.parse(value);
}

export function parseSiteMenuItems(value: unknown): SiteMenuItem[] {
  return siteMenuItemsSchema.parse(value);
}

export function getSectionLabel(content: SiteSectionContent): LocalizedText {
  switch (content.type) {
    case "hero":
      return content.title;
    case "about":
      return content.title;
    case "menu":
      return content.title;
    case "hours":
      return content.title;
    case "contact":
      return content.title;
    case "loyalty":
      return content.title;
    default:
      return assertNever(content);
  }
}
