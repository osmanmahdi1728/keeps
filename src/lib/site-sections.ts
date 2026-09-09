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

const contactContentSchema = z.object({
  type: z.literal("contact"),
  title: localizedTextSchema,
  body: localizedTextSchema,
  address: localizedTextSchema.optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  instagram: z.string().optional(),
  mapUrl: z.string().url().optional(),
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
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const videoMediaSchema = z.object({
  kind: z.literal("video"),
  key: z.string().min(1),
  url: z.string().url(),
  title: localizedTextSchema,
  posterUrl: z.string().url().optional(),
});

export const siteMediaSchema = z.discriminatedUnion("kind", [
  imageMediaSchema,
  videoMediaSchema,
]);

export type SiteLocale = (typeof SITE_LOCALES)[number];
export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type SiteSectionContent = z.infer<typeof siteSectionContentSchema>;
export type SiteSection = z.infer<typeof siteSectionSchema>;
export type SiteMenuItem = z.infer<typeof siteMenuItemSchema>;
export type SiteMedia = z.infer<typeof siteMediaSchema>;

export type DefaultSiteSectionsInput = {
  merchantName: string;
  neighborhood?: string;
  knownFor?: string;
  hours?: string;
  rewardLabel?: string;
  stampsRequired?: number;
  instagram?: string;
};

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

export function createDefaultSiteSections(
  input: DefaultSiteSectionsInput,
): SiteSection[] {
  const neighborhood = input.neighborhood?.trim() || "Your neighborhood";
  const knownFor =
    input.knownFor?.trim() || "Thoughtful service and everyday favorites.";
  const hours = input.hours?.trim() || "Open daily";
  const rewardLabel = input.rewardLabel?.trim() || "a reward";
  const stampsRequired = input.stampsRequired ?? 10;
  const instagram = input.instagram?.trim() || undefined;

  return siteSectionsSchema.parse([
    {
      key: "hero",
      position: 0,
      content: {
        type: "hero",
        eyebrow: { en: neighborhood, fr: neighborhood },
        title: {
          en: `Welcome to ${input.merchantName}`,
          fr: `Bienvenue chez ${input.merchantName}`,
        },
        body: {
          en: knownFor,
          fr: "Un accueil attentionné et des incontournables préparés avec soin.",
        },
        primaryAction: {
          label: { en: "Get the loyalty card", fr: "Obtenir la carte fidélité" },
          href: "#loyalty",
        },
        secondaryAction: {
          label: { en: "See the menu", fr: "Voir le menu" },
          href: "#menu",
        },
      },
    },
    {
      key: "about",
      position: 10,
      content: {
        type: "about",
        title: { en: "Made for the neighborhood", fr: "Pensé pour le quartier" },
        body: {
          en: `${input.merchantName} is a place to slow down, enjoy something good, and feel at home.`,
          fr: `${input.merchantName}, c’est un endroit où ralentir, savourer et se sentir chez soi.`,
        },
        highlights: [],
      },
    },
    {
      key: "menu",
      position: 20,
      content: {
        type: "menu",
        title: { en: "Menu highlights", fr: "Les incontournables" },
        body: {
          en: "A focused selection, made well.",
          fr: "Une sélection soignée, préparée comme il faut.",
        },
        showPrices: true,
      },
    },
    {
      key: "hours",
      position: 30,
      content: {
        type: "hours",
        title: { en: "Hours", fr: "Heures d’ouverture" },
        entries: [
          {
            day: { en: "Every day", fr: "Tous les jours" },
            hours: { en: hours, fr: hours },
          },
        ],
      },
    },
    {
      key: "loyalty",
      position: 40,
      content: {
        type: "loyalty",
        title: { en: "Regulars deserve more", fr: "Les habitués méritent plus" },
        body: {
          en: `Collect ${stampsRequired} stamps and enjoy ${rewardLabel.toLowerCase()}.`,
          fr: `Cumulez ${stampsRequired} étampes et profitez de votre récompense.`,
        },
        action: {
          label: { en: "Add your card", fr: "Ajouter votre carte" },
          href: "#card",
        },
      },
    },
    {
      key: "contact",
      position: 50,
      content: {
        type: "contact",
        title: { en: "Come say hello", fr: "Venez nous voir" },
        body: {
          en: `Find us in ${neighborhood}.`,
          fr: `Retrouvez-nous à ${neighborhood}.`,
        },
        instagram,
      },
    },
  ]);
}
