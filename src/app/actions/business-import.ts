"use server";

import { Buffer } from "node:buffer";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/guards";
import {
  downloadGooglePhoto,
  getGooglePlace,
  searchGooglePlaces,
  type NormalizedPlace,
  type PlaceSearchResult,
} from "@/lib/google-places";
import {
  importedBrandingSchema,
  suggestImportedBranding,
  type ImportedBranding,
} from "@/lib/import-branding";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import {
  deleteMerchantImage,
  saveMerchantImage,
  saveMerchantImageBytes,
} from "@/lib/logo";
import { prisma } from "@/lib/db";
import {
  inferSiteKind,
  suggestProgram,
  type SiteKindId,
} from "@/lib/site-kinds";
import { draftWebsite, type SiteDraft, type SiteDraftAnswers } from "@/lib/site-ai";
import { siteMediaSchema, type SiteMedia } from "@/lib/site-sections";
import { analyzeBusinessWebsite, type WebsiteAnalysis } from "@/lib/website-analysis";
const placeSearchSchema = z.string().trim().min(3).max(160);
const importRequestSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("google"),
    placeId: z.string().trim().min(3).max(300),
    instagram: z.string().trim().max(300).optional(),
  }),
  z.object({
    source: z.literal("website"),
    websiteUrl: z.string().trim().url().max(500),
    instagram: z.string().trim().max(300).optional(),
  }),
]);
const uploadSchema = z.object({
  altEn: z.string().trim().min(1).max(160),
  altFr: z.string().trim().min(1).max(160),
});
const imagePromptSchema = z.string().trim().min(10).max(500);
const placeSearchCache = new Map<
  string,
  { expiresAt: number; results: PlaceSearchResult[] }
>();
const lastSearchByMerchant = new Map<string, number>();

export type BusinessImportResult = {
  suggestedName: string;
  siteKind: SiteKindId;
  answers: SiteDraftAnswers;
  draft: SiteDraft;
  branding: ImportedBranding;
  media: SiteMedia[];
  facts: string[];
  sourceLabel: string;
  programSuggestion: {
    rewardLabel: string;
    stampsRequired: number;
  };
};

function normalizeInstagram(value: string | undefined): string {
  const input = value?.trim() ?? "";
  if (!input) {
    return "";
  }
  if (/^@?[a-z0-9._]{1,30}$/i.test(input)) {
    return `https://www.instagram.com/${input.replace(/^@/, "")}/`;
  }
  try {
    const url = new URL(input);
    if (
      url.protocol === "https:" &&
      ["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase())
    ) {
      return url.toString();
    }
  } catch {
    // Validation below returns an empty link rather than persisting unsafe input.
  }
  return "";
}

function localized(value: string): { en: string; fr: string } {
  return { en: value, fr: value };
}

function placeAnswers(place: NormalizedPlace): SiteDraftAnswers {
  return {
    neighborhood: localized(place.address),
    hours: localized(place.hours.join("\n")),
    knownFor: localized(
      place.primaryType
        ? `${place.name} is a local ${place.primaryType.replaceAll("_", " ")}.`
        : `${place.name} is a local business.`,
    ),
  };
}

function websiteAnswers(analysis: WebsiteAnalysis): SiteDraftAnswers {
  return {
    neighborhood: localized(""),
    hours: localized(""),
    knownFor: localized(analysis.description || analysis.text.slice(0, 500)),
  };
}

async function saveGoogleMedia(
  merchantId: string,
  place: NormalizedPlace,
  maximum: number,
): Promise<SiteMedia[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN || maximum === 0) {
    return [];
  }
  const media: SiteMedia[] = [];
  for (const [index, photo] of place.photos.slice(0, Math.min(4, maximum)).entries()) {
    try {
      const image = await downloadGooglePhoto(photo.name);
      const url = await saveMerchantImageBytes(
        merchantId,
        image.bytes,
        image.contentType,
        "gallery",
      );
      media.push(
        siteMediaSchema.parse({
          kind: "image",
          key: `google-pending-${index + 1}`,
          url,
          alt: localized(`${place.name} photo ${index + 1}`),
          position: index * 10,
          width: photo.width ?? undefined,
          height: photo.height ?? undefined,
          metadata: {
            source: "google-pending",
            sourceUrl: place.mapsUrl || undefined,
            attribution: photo.attribution.map((item) => ({
              name: item.name,
              uri: item.uri || undefined,
            })),
          },
        }),
      );
    } catch {
      // A missing photo should not block importing the business facts.
    }
  }
  return media;
}

async function persistImportedMedia(merchantId: string, media: SiteMedia[]): Promise<void> {
  if (media.length === 0) {
    return;
  }
  const previous = await prisma.siteMedia.findMany({
    where: {
      merchantId,
      metadata: { path: ["source"], equals: "google-pending" },
    },
    select: { url: true },
  });
  const images = media.filter(
    (item): item is Extract<SiteMedia, { kind: "image" }> =>
      item.kind === "image",
  );
  await prisma.$transaction([
    prisma.siteMedia.deleteMany({
      where: {
        merchantId,
        metadata: { path: ["source"], equals: "google-pending" },
      },
    }),
    prisma.siteMedia.createMany({
      data: images.map((item) => ({
        merchantId,
        key: item.key,
        kind: item.kind,
        url: item.url,
        alt: item.alt,
        position: item.position,
        width: item.width ?? null,
        height: item.height ?? null,
        metadata: item.metadata
          ? (item.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      })),
    }),
  ]);
  await Promise.all(
    previous.map((item) => deleteMerchantImage(item.url).catch(() => undefined)),
  );
}

export async function searchBusinesses(
  query: string,
): Promise<{ results: PlaceSearchResult[] } | { error: string }> {
  const locale = await getLocale();
  const parsed = placeSearchSchema.safeParse(query);
  if (!parsed.success) {
    return { error: translate(locale, "editorImportQueryInvalid") };
  }
  const merchant = await requireMerchant();
  const cacheKey = `${locale}:${parsed.data.toLowerCase()}`;
  const cached = placeSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { results: cached.results };
  }
  const lastSearch = lastSearchByMerchant.get(merchant.id) ?? 0;
  if (Date.now() - lastSearch < 1_500) {
    return { error: translate(locale, "editorSearchTooFast") };
  }
  lastSearchByMerchant.set(merchant.id, Date.now());
  try {
    const results = await searchGooglePlaces(parsed.data, locale);
    if (placeSearchCache.size >= 100) {
      const oldestKey = placeSearchCache.keys().next().value;
      if (oldestKey) {
        placeSearchCache.delete(oldestKey);
      }
    }
    placeSearchCache.set(cacheKey, {
      expiresAt: Date.now() + 5 * 60_000,
      results,
    });
    return { results };
  } catch {
    return { error: translate(locale, "editorImportUnavailable") };
  }
}

export async function importBusiness(
  input: unknown,
): Promise<BusinessImportResult | { error: string }> {
  const locale = await getLocale();
  const parsed = importRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: translate(locale, "editorImportInvalid") };
  }
  const merchant = await requireMerchant();
  if (!merchant.program) {
    return { error: translate(locale, "editorImportInvalid") };
  }
  const instagram = normalizeInstagram(parsed.data.instagram);

  try {
    if (parsed.data.source === "google") {
      const place = await getGooglePlace(parsed.data.placeId);
      let website: WebsiteAnalysis | null = null;
      if (place.website) {
        website = await analyzeBusinessWebsite(place.website).catch(() => null);
      }
      const siteKind = inferSiteKind(place.primaryType);
      const programSuggestion = suggestProgram(siteKind);
      const answers = placeAnswers(place);
      if (website?.description) {
        answers.knownFor = localized(website.description);
      }
      const draft = await draftWebsite({
        name: place.name,
        kind: siteKind,
        answers,
        rewardLabel: programSuggestion.rewardLabel,
        stampsRequired: programSuggestion.stampsRequired,
        instagram,
        sourceFacts: {
          address: place.address,
          phone: place.phone,
          website: place.website,
          mapsUrl: place.mapsUrl,
          rating: place.rating,
          ratingCount: place.ratingCount,
          rawWebsiteText: website?.text ?? "",
        },
      });
      const existingMedia = await prisma.siteMedia.findMany({
        where: { merchantId: merchant.id },
        select: { metadata: true },
      });
      const nonGoogleMediaCount = existingMedia.filter((item) => {
        const metadata =
          item.metadata &&
          typeof item.metadata === "object" &&
          !Array.isArray(item.metadata)
            ? item.metadata
            : null;
        return metadata?.source !== "google";
      }).length;
      const media = await saveGoogleMedia(
        merchant.id,
        place,
        Math.max(0, 12 - nonGoogleMediaCount),
      );
      await prisma.$transaction([
        prisma.googlePlaceSnapshot.upsert({
          where: { merchantId: merchant.id },
          create: {
            merchantId: merchant.id,
            placeId: place.id,
            payload: place as unknown as Prisma.InputJsonValue,
          },
          update: {
            placeId: place.id,
            payload: place as unknown as Prisma.InputJsonValue,
            syncedAt: new Date(),
          },
        }),
        prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            googlePlaceId: place.id,
            placeSyncedAt: new Date(),
          },
        }),
      ]);
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        await persistImportedMedia(merchant.id, media);
      }
      revalidatePath("/website");
      return {
        suggestedName: place.name,
        siteKind,
        answers,
        draft,
        branding: suggestImportedBranding(siteKind, website?.themeColor),
        media,
        facts: [
          place.address,
          place.phone,
          place.hours.join(" · "),
          place.rating ? `${place.rating}/5 (${place.ratingCount})` : "",
          place.website,
        ].filter(Boolean),
        sourceLabel: "Google Places",
        programSuggestion,
      };
    }

    const website = await analyzeBusinessWebsite(parsed.data.websiteUrl);
    const siteKind = inferSiteKind(`${website.title} ${website.description} ${website.text.slice(0, 500)}`);
    const programSuggestion = suggestProgram(siteKind);
    const answers = websiteAnswers(website);
    const suggestedName =
      website.title.split(/\s+[|–—]\s+/)[0]?.trim() || merchant.name;
    const draft = await draftWebsite({
      name: suggestedName,
      kind: siteKind,
      answers,
      rewardLabel: programSuggestion.rewardLabel,
      stampsRequired: programSuggestion.stampsRequired,
      instagram,
      sourceFacts: {
        website: website.url,
        rawWebsiteText: website.text,
      },
    });
    return {
      suggestedName,
      siteKind,
      answers,
      draft,
      branding: importedBrandingSchema.parse(
        suggestImportedBranding(siteKind, website.themeColor),
      ),
      media: [],
      facts: [website.url, website.description].filter(Boolean),
      sourceLabel: new URL(website.url).hostname,
      programSuggestion,
    };
  } catch {
    return { error: translate(locale, "editorImportFailed") };
  }
}

export async function uploadWebsiteImage(
  formData: FormData,
): Promise<{ media: SiteMedia } | { error: string }> {
  const locale = await getLocale();
  const parsed = uploadSchema.safeParse({
    altEn: formData.get("altEn"),
    altFr: formData.get("altFr"),
  });
  const file = formData.get("image");
  if (!parsed.success || !(file instanceof File) || file.size === 0) {
    return { error: translate(locale, "editorUploadInvalid") };
  }
  const merchant = await requireMerchant();
  const count = await prisma.siteMedia.count({ where: { merchantId: merchant.id } });
  if (count >= 12) {
    return { error: translate(locale, "editorUploadLimit") };
  }
  try {
    const url = await saveMerchantImage(merchant.id, file, "gallery");
    const media = siteMediaSchema.parse({
      kind: "image",
      key: `upload-${Date.now()}`,
      url,
      alt: { en: parsed.data.altEn, fr: parsed.data.altFr },
      position: count * 10,
      metadata: { source: "upload" },
    });
    if (media.kind !== "image") {
      return { error: translate(locale, "editorUploadInvalid") };
    }
    await prisma.siteMedia.create({
      data: {
        merchantId: merchant.id,
        key: media.key,
        kind: media.kind,
        url: media.url,
        alt: media.alt,
        position: media.position,
        metadata: media.metadata ?? Prisma.DbNull,
      },
    });
    revalidatePath("/website");
    revalidatePath(`/s/${merchant.slug}`);
    return { media };
  } catch {
    return { error: translate(locale, "editorUploadFailed") };
  }
}

export async function generateWebsiteImage(
  prompt: string,
): Promise<{ media: SiteMedia } | { error: string }> {
  const locale = await getLocale();
  const parsed = imagePromptSchema.safeParse(prompt);
  if (
    !parsed.success ||
    !process.env.OPENAI_API_KEY ||
    !process.env.BLOB_READ_WRITE_TOKEN
  ) {
    return { error: translate(locale, "editorAiImageUnavailable") };
  }
  const merchant = await requireMerchant();
  const existing = await prisma.siteMedia.findMany({
    where: { merchantId: merchant.id },
    select: { metadata: true, createdAt: true },
  });
  if (existing.length >= 12) {
    return { error: translate(locale, "editorUploadLimit") };
  }
  const hasRealImage = existing.some((item) => {
    const metadata =
      item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
        ? item.metadata
        : null;
    return !metadata || metadata.source !== "ai";
  });
  if (hasRealImage) {
    return { error: translate(locale, "editorAiImageRealFirst") };
  }
  const aiImages = existing.filter((item) => {
    const metadata =
      item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
        ? item.metadata
        : null;
    return metadata?.source === "ai";
  });
  if (
    aiImages.length >= 2 ||
    aiImages.some((item) => Date.now() - item.createdAt.getTime() < 120_000)
  ) {
    return { error: translate(locale, "editorAiImageLimit") };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        prompt: `Editorial storefront photograph for an independent local business website. ${parsed.data}. No text, logos, trademarks, people, or identifiable private information.`,
        size: "1536x1024",
        quality: "medium",
        output_format: "webp",
      }),
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    if (!response.ok) {
      return { error: translate(locale, "editorAiImageFailed") };
    }
    const payload = z
      .object({ data: z.array(z.object({ b64_json: z.string() })).min(1) })
      .parse(await response.json());
    const bytes = new Uint8Array(Buffer.from(payload.data[0].b64_json, "base64"));
    const url = await saveMerchantImageBytes(
      merchant.id,
      bytes,
      "image/webp",
      "gallery",
    );
    const count = await prisma.siteMedia.count({ where: { merchantId: merchant.id } });
    const media = siteMediaSchema.parse({
      kind: "image",
      key: `ai-${Date.now()}`,
      url,
      alt: {
        en: `AI-generated atmosphere image for ${merchant.name}`,
        fr: `Image d’ambiance générée par IA pour ${merchant.name}`,
      },
      position: count * 10,
      metadata: { source: "ai" },
    });
    if (media.kind !== "image") {
      return { error: translate(locale, "editorAiImageFailed") };
    }
    await prisma.siteMedia.create({
      data: {
        merchantId: merchant.id,
        key: media.key,
        kind: media.kind,
        url: media.url,
        alt: media.alt,
        position: media.position,
        metadata: media.metadata ?? Prisma.JsonNull,
      },
    });
    revalidatePath("/website");
    revalidatePath(`/s/${merchant.slug}`);
    return { media };
  } catch {
    return { error: translate(locale, "editorAiImageFailed") };
  }
}

export async function deleteWebsiteImage(
  mediaKey: string,
): Promise<{ deleted: true } | { error: string }> {
  const locale = await getLocale();
  const parsed = z.string().min(1).max(120).safeParse(mediaKey);
  if (!parsed.success) {
    return { error: translate(locale, "editorDeleteImageFailed") };
  }
  const merchant = await requireMerchant();
  const media = await prisma.siteMedia.findUnique({
    where: {
      merchantId_key: {
        merchantId: merchant.id,
        key: parsed.data,
      },
    },
  });
  if (!media) {
    return { error: translate(locale, "editorDeleteImageFailed") };
  }
  await prisma.siteMedia.delete({ where: { id: media.id } });
  await deleteMerchantImage(media.url).catch(() => undefined);
  revalidatePath("/website");
  revalidatePath(`/s/${merchant.slug}`);
  return { deleted: true };
}
