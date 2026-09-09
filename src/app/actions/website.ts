"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isSiteKind, isSiteTemplate } from "@/lib/site";
import {
  draftWebsite,
  type SiteDraft,
  type SiteDraftAnswers,
} from "@/lib/site-ai";
import {
  localizedTextSchema,
  siteMenuItemsSchema,
  siteSectionsSchema,
  type SiteSection,
} from "@/lib/site-sections";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { assertNever } from "@/lib/types";

const answerTextSchema = (maximum: number) =>
  localizedTextSchema.extend({
    en: z.string().trim().max(maximum),
    fr: z.string().trim().max(maximum),
  });

const answersSchema = z.object({
  neighborhood: answerTextSchema(120),
  hours: answerTextSchema(200),
  knownFor: answerTextSchema(500),
});

const draftRequestSchema = z.object({
  siteKind: z.string(),
  answers: answersSchema,
});

const saveWebsiteSchema = z
  .object({
    siteTemplate: z.string(),
    siteKind: z.string(),
    answers: answersSchema,
    sections: siteSectionsSchema.min(1).max(12),
    menuItems: siteMenuItemsSchema.max(40),
    sitePublished: z.boolean(),
  })
  .superRefine((value, context) => {
    const types = new Set(value.sections.map((section) => section.content.type));
    for (const type of [
      "hero",
      "about",
      "menu",
      "hours",
      "contact",
      "loyalty",
    ] as const) {
      if (!types.has(type)) {
        context.addIssue({
          code: "custom",
          message: `Missing ${type} section`,
          path: ["sections"],
        });
      }
    }

    const serialized = JSON.stringify(value);
    if (serialized.length > 100_000 || /<\/?(?:script|iframe|object|embed|style)\b/i.test(serialized)) {
      context.addIssue({
        code: "custom",
        message: "Website content is invalid",
      });
    }

    const menuKeys = new Set<string>();
    for (const [index, item] of value.menuItems.entries()) {
      if (menuKeys.has(item.key)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate menu item key: ${item.key}`,
          path: ["menuItems", index, "key"],
        });
      }
      menuKeys.add(item.key);
    }

    for (const section of value.sections) {
      const content = section.content;
      if (content.type === "hero") {
        for (const action of [content.primaryAction, content.secondaryAction]) {
          if (action && !action.href.startsWith("#") && !action.href.startsWith("/")) {
            context.addIssue({
              code: "custom",
              message: "Website actions must use local links",
              path: ["sections"],
            });
          }
        }
      } else if (content.type === "loyalty") {
        if (!content.action.href.startsWith("#") && !content.action.href.startsWith("/")) {
          context.addIssue({
            code: "custom",
            message: "Website actions must use local links",
            path: ["sections"],
          });
        }
      }
    }
  });

type WebsiteActionError = { error: string };

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

async function requireWebsiteMerchant() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const merchant = await prisma.merchant.findUnique({
    where: { userId: session.user.id },
    include: { program: true },
  });
  if (!merchant?.program) {
    redirect("/onboarding");
  }
  return merchant;
}

export async function generateWebsiteDraft(
  formData: FormData,
): Promise<WebsiteActionError | SiteDraft> {
  const locale = await getLocale();
  const parsed = draftRequestSchema.safeParse({
    siteKind: formData.get("siteKind"),
    answers: parseJson(formData.get("answers")),
  });
  if (!parsed.success || !isSiteKind(parsed.data.siteKind)) {
    return { error: translate(locale, "websiteInvalid") };
  }

  const merchant = await requireWebsiteMerchant();
  if (!merchant.program) {
    redirect("/onboarding");
  }
  return draftWebsite({
    name: merchant.name,
    kind: parsed.data.siteKind,
    answers: parsed.data.answers,
    rewardLabel: merchant.program.rewardLabel,
    stampsRequired: merchant.program.stampsRequired,
    instagram: merchant.instagram,
  });
}

function getLegacyFields(
  sections: SiteSection[],
  answers: SiteDraftAnswers,
): {
  tagline: string;
  about: string;
  hours: string;
  instagram: string;
} {
  let tagline = "";
  let about = "";
  let hours = answers.hours.en;
  let instagram = "";

  for (const section of sections) {
    const content = section.content;
    switch (content.type) {
      case "hero":
        tagline = content.title.en;
        if (!about) {
          about = content.body.en;
        }
        break;
      case "about":
        about = content.body.en;
        break;
      case "hours":
        hours = content.entries[0]?.hours.en || hours;
        break;
      case "contact":
        instagram = content.instagram?.replace(/^@/, "") ?? "";
        break;
      case "menu":
      case "loyalty":
        break;
      default:
        assertNever(content);
    }
  }

  return { tagline, about, hours, instagram };
}

export async function updateWebsite(
  formData: FormData,
): Promise<WebsiteActionError | { saved: true }> {
  const locale = await getLocale();
  const parsed = saveWebsiteSchema.safeParse({
    siteTemplate: formData.get("siteTemplate"),
    siteKind: formData.get("siteKind"),
    answers: parseJson(formData.get("answers")),
    sections: parseJson(formData.get("sections")),
    menuItems: parseJson(formData.get("menuItems")),
    sitePublished: formData.get("sitePublished") === "on",
  });

  if (!parsed.success || !isSiteKind(parsed.data.siteKind) || !isSiteTemplate(parsed.data.siteTemplate)) {
    return { error: translate(locale, "websiteInvalid") };
  }

  const merchant = await requireWebsiteMerchant();
  const legacy = getLegacyFields(parsed.data.sections, parsed.data.answers);

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.merchant.update({
        where: { id: merchant.id },
        data: {
          siteTemplate: parsed.data.siteTemplate,
          siteKind: parsed.data.siteKind,
          neighborhood: parsed.data.answers.neighborhood.en,
          hours: legacy.hours,
          knownFor: parsed.data.answers.knownFor.en,
          instagram: legacy.instagram,
          tagline: legacy.tagline,
          about: legacy.about,
          sitePublished: parsed.data.sitePublished,
          siteVersion: 2,
        },
      });

      await transaction.siteMenuItem.deleteMany({
        where: { merchantId: merchant.id },
      });
      await transaction.siteSection.deleteMany({
        where: { merchantId: merchant.id },
      });

      let menuSectionId: string | null = null;
      for (const section of parsed.data.sections) {
        const created = await transaction.siteSection.create({
          data: {
            merchantId: merchant.id,
            key: section.key,
            type: section.content.type,
            position: section.position,
            enabled: section.enabled,
            content: section.content as Prisma.InputJsonValue,
          },
        });
        if (section.content.type === "menu") {
          menuSectionId = created.id;
        }
      }

      if (parsed.data.menuItems.length > 0) {
        await transaction.siteMenuItem.createMany({
          data: parsed.data.menuItems.map((item) => ({
            merchantId: merchant.id,
            sectionId: menuSectionId,
            key: item.key,
            name: item.name,
            description: item.description ?? Prisma.DbNull,
            category: item.category ?? Prisma.DbNull,
            priceCents: item.priceCents,
            currency: item.currency,
            position: item.position,
            available: item.available,
          })),
        });
      }
    });
  } catch {
    return { error: translate(locale, "websiteSaveError") };
  }

  revalidatePath("/website");
  revalidatePath(`/s/${merchant.slug}`);
  revalidatePath(`/join/${merchant.slug}`);
  return { saved: true };
}
