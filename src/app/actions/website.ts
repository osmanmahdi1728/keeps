"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isSiteKind, isSiteTemplate } from "@/lib/site";
import { polishSiteCopy } from "@/lib/site-ai";

const siteSchema = z.object({
  siteTemplate: z.string(),
  siteKind: z.string(),
  neighborhood: z.string().trim().max(80),
  hours: z.string().trim().min(2).max(80),
  knownFor: z.string().trim().max(160),
  instagram: z.string().trim().max(80),
  tagline: z.string().trim().max(120),
  about: z.string().trim().max(500),
  sitePublished: z.boolean(),
  generate: z.boolean(),
});

export async function updateWebsite(
  formData: FormData,
): Promise<{ error: string } | { saved: true; usedAi: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = siteSchema.safeParse({
    siteTemplate: formData.get("siteTemplate"),
    siteKind: formData.get("siteKind"),
    neighborhood: formData.get("neighborhood") ?? "",
    hours: formData.get("hours"),
    knownFor: formData.get("knownFor") ?? "",
    instagram: String(formData.get("instagram") ?? "").replace(/^@/, ""),
    tagline: formData.get("tagline") ?? "",
    about: formData.get("about") ?? "",
    sitePublished: formData.get("sitePublished") === "on",
    generate: formData.get("generate") === "on",
  });

  if (!parsed.success || !isSiteKind(parsed.data.siteKind) || !isSiteTemplate(parsed.data.siteTemplate)) {
    return { error: "Check the shop type, hours, and template." };
  }

  const merchant = await prisma.merchant.findUnique({
    where: { userId: session.user.id },
    include: { program: true },
  });
  if (!merchant?.program) {
    redirect("/onboarding");
  }

  let tagline = parsed.data.tagline;
  let about = parsed.data.about;
  let usedAi = false;

  if (parsed.data.generate || !tagline || !about) {
    const copy = await polishSiteCopy({
      name: merchant.name,
      kind: parsed.data.siteKind,
      neighborhood: parsed.data.neighborhood,
      hours: parsed.data.hours,
      knownFor: parsed.data.knownFor,
      rewardLabel: merchant.program.rewardLabel,
      stampsRequired: merchant.program.stampsRequired,
    });
    tagline = copy.tagline;
    about = copy.about;
    usedAi = copy.usedAi;
  }

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      siteTemplate: parsed.data.siteTemplate,
      siteKind: parsed.data.siteKind,
      neighborhood: parsed.data.neighborhood,
      hours: parsed.data.hours,
      knownFor: parsed.data.knownFor,
      instagram: parsed.data.instagram,
      tagline,
      about,
      sitePublished: parsed.data.sitePublished,
    },
  });

  revalidatePath("/website");
  revalidatePath(`/s/${merchant.slug}`);
  revalidatePath(`/join/${merchant.slug}`);
  return { saved: true, usedAi };
}
