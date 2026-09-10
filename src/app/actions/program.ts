"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import { slugify } from "@/lib/ids";
import { isCardFont } from "@/lib/card-design";
import { isSiteKind } from "@/lib/site";
import { deleteMerchantImage, saveMerchantLogo } from "@/lib/logo";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { refreshWalletPass } from "@/lib/wallet/update";

const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  rewardLabel: z.string().trim().min(2).max(80),
  stampsRequired: z.coerce.number().int().min(3).max(20),
  siteKind: z.string().refine(isSiteKind),
});

export async function completeOnboarding(formData: FormData): Promise<{ error: string } | undefined> {
  const locale = await getLocale();
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    rewardLabel: formData.get("rewardLabel"),
    stampsRequired: formData.get("stampsRequired"),
    siteKind: formData.get("siteKind"),
  });

  if (!parsed.success) {
    return { error: translate(locale, "onboardingInvalid") };
  }

  const existing = await prisma.merchant.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    redirect("/dashboard");
  }

  const slug = await uniqueSlug(slugify(parsed.data.name));
  await prisma.merchant.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      slug,
      siteKind: parsed.data.siteKind,
      program: {
        create: {
          rewardLabel: parsed.data.rewardLabel,
          stampsRequired: parsed.data.stampsRequired,
        },
      },
    },
  });

  redirect("/program?setup=1");
}

const programSchema = z.object({
  name: z.string().trim().min(2).max(80),
  rewardLabel: z.string().trim().min(2).max(80),
  stampsRequired: z.coerce.number().int().min(3).max(20),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  logoUrl: z.string().trim().max(400).optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  gradientEnd: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  fontFamily: z.string(),
  templateId: z.string().trim().min(1).max(40),
});

export async function updateProgram(
  formData: FormData,
): Promise<{ error: string } | { saved: true } | undefined> {
  const locale = await getLocale();
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = programSchema.safeParse({
    name: formData.get("name"),
    rewardLabel: formData.get("rewardLabel"),
    stampsRequired: formData.get("stampsRequired"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    primaryColor: formData.get("primaryColor"),
    backgroundColor: formData.get("backgroundColor"),
    accentColor: formData.get("accentColor"),
    gradientEnd: formData.get("gradientEnd"),
    fontFamily: formData.get("fontFamily"),
    templateId: formData.get("templateId"),
  });

  if (!parsed.success || !isCardFont(parsed.data.fontFamily)) {
    return { error: translate(locale, "programInvalid") };
  }

  const merchant = await prisma.merchant.findUnique({
    where: { userId: session.user.id },
    include: { program: true },
  });
  if (!merchant?.program) {
    redirect("/onboarding");
  }

  // Existing logos can only be retained; a new URL must come from this
  // merchant's validated Blob upload below.
  let logoUrl = merchant.logoUrl;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    try {
      logoUrl = await saveMerchantLogo(merchant.id, logo);
    } catch {
      return { error: translate(locale, "logoSaveError") };
    }
  }

  await prisma.$transaction([
    prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        name: parsed.data.name,
        logoUrl: logoUrl || null,
        primaryColor: parsed.data.primaryColor,
        backgroundColor: parsed.data.backgroundColor,
        accentColor: parsed.data.accentColor,
        gradientEnd: parsed.data.gradientEnd,
        fontFamily: parsed.data.fontFamily,
        templateId: parsed.data.templateId,
      },
    }),
    prisma.program.update({
      where: { id: merchant.program.id },
      data: {
        rewardLabel: parsed.data.rewardLabel,
        stampsRequired: parsed.data.stampsRequired,
        description: parsed.data.description || null,
      },
    }),
  ]);
  if (logoUrl && logoUrl !== merchant.logoUrl && merchant.logoUrl) {
    await deleteMerchantImage(merchant.logoUrl).catch(() => undefined);
  }
  const passes = await prisma.pass.findMany({
    where: { customer: { programId: merchant.program.id } },
    select: { id: true },
  });
  await Promise.allSettled(passes.map((pass) => refreshWalletPass(pass.id)));
  revalidatePath("/program");
  revalidatePath("/dashboard");
  revalidatePath(`/join/${merchant.slug}`);
  return { saved: true };
}
