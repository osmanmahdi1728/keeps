import { z } from "zod";
import {
  createDefaultSiteSections,
  siteMenuItemsSchema,
  siteSectionsSchema,
  type LocalizedText,
  type SiteMenuItem,
  type SiteSection,
} from "@/lib/site-sections";
import { assertNever } from "@/lib/types";

export function isSiteAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const siteDraftSchema = z
  .object({
    sections: siteSectionsSchema,
    menuItems: siteMenuItemsSchema,
  })
  .superRefine((draft, context) => {
    const serialized = JSON.stringify(draft);
    if (serialized.length > 80_000) {
      context.addIssue({
        code: "custom",
        message: "Draft is too large",
      });
    }
    if (/<\/?[a-z][^>]*>/i.test(serialized)) {
      context.addIssue({
        code: "custom",
        message: "Draft must contain plain text, not HTML",
      });
    }
    if (draft.menuItems.length > 40) {
      context.addIssue({
        code: "custom",
        message: "Draft has too many menu items",
        path: ["menuItems"],
      });
    }
    for (const section of draft.sections) {
      const content = section.content;
      switch (content.type) {
        case "hero":
          for (const action of [
            content.primaryAction,
            content.secondaryAction,
          ]) {
            if (
              action &&
              !action.href.startsWith("#") &&
              !action.href.startsWith("/")
            ) {
              context.addIssue({
                code: "custom",
                message: "Draft actions must use local links",
                path: ["sections"],
              });
            }
          }
          break;
        case "loyalty":
          if (
            !content.action.href.startsWith("#") &&
            !content.action.href.startsWith("/")
          ) {
            context.addIssue({
              code: "custom",
              message: "Draft actions must use local links",
              path: ["sections"],
            });
          }
          break;
        case "about":
        case "menu":
        case "hours":
        case "contact":
          break;
        default:
          assertNever(content);
      }
    }
  });

export type SiteDraftAnswers = {
  neighborhood: LocalizedText;
  hours: LocalizedText;
  knownFor: LocalizedText;
};

export type SiteDraft = {
  sections: SiteSection[];
  menuItems: SiteMenuItem[];
  usedAi: boolean;
};

type SiteDraftInput = {
  name: string;
  kind: string;
  answers: SiteDraftAnswers;
  rewardLabel: string;
  stampsRequired: number;
  instagram: string;
};

function createFallbackDraft(input: SiteDraftInput): SiteDraft {
  const sections = createDefaultSiteSections({
    merchantName: input.name,
    neighborhood: input.answers.neighborhood.en,
    hours: input.answers.hours.en,
    knownFor: input.answers.knownFor.en,
    rewardLabel: input.rewardLabel,
    stampsRequired: input.stampsRequired,
    instagram: input.instagram,
  }).map((section) => {
    if (section.content.type === "hero") {
      return {
        ...section,
        content: {
          ...section.content,
          eyebrow: input.answers.neighborhood,
          body: input.answers.knownFor,
        },
      };
    }
    if (section.content.type === "hours") {
      return {
        ...section,
        content: {
          ...section.content,
          entries: [
            {
              day: { en: "Every day", fr: "Tous les jours" },
              hours: input.answers.hours,
            },
          ],
        },
      };
    }
    return section;
  });

  const knownFor = input.answers.knownFor;
  const menuItems = knownFor.en || knownFor.fr
    ? [
        {
          key: "signature",
          name: {
            en: knownFor.en || "House favorite",
            fr: knownFor.fr || "Coup de cœur maison",
          },
          description: {
            en: "One of the things our regulars come back for.",
            fr: "Un incontournable que nos habitués aiment retrouver.",
          },
          category: { en: "Featured", fr: "En vedette" },
          priceCents: null,
          currency: "CAD",
          position: 0,
          available: true,
        },
      ]
    : [];

  const parsed = siteDraftSchema.parse({ sections, menuItems });
  return { ...parsed, usedAi: false };
}

export async function draftWebsite(
  input: SiteDraftInput,
): Promise<SiteDraft> {
  const fallback = createFallbackDraft(input);
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return fallback;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Create concise premium one-page website copy for an independent Montreal business. Return JSON only with exactly {sections,menuItems}. Every customer-facing string must be bilingual as {en,fr}. Use section types hero, about, menu, hours, loyalty, contact and preserve their matching content shapes. Include stable lowercase keys, integer positions, enabled booleans, and at most 8 menu items. Return plain text only: no HTML, Markdown, scripts, data URLs, or executable content.",
          },
          {
            role: "user",
            content: JSON.stringify({
              business: input,
              requiredShape: {
                sections: fallback.sections,
                menuItems: fallback.menuItems,
              },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const parsedJson: unknown = JSON.parse(raw);
    const parsed = siteDraftSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return fallback;
    }
    return { ...parsed.data, usedAi: true };
  } catch {
    return fallback;
  }
}
