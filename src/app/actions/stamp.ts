"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  assertNever,
  type StampActionResult,
  type StampEventType,
} from "@/lib/types";
import { refreshWalletPass } from "@/lib/wallet/update";
import { rewardReadyEmailHtml, sendEmail } from "@/lib/email/send";
import { getLocale } from "@/lib/i18n-server";
import { translate, type Locale } from "@/lib/i18n";

const lookupSchema = z.object({
  query: z.string().trim().min(2).max(120),
});

async function requireMerchantProgram() {
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

export async function lookupPass(formData: FormData): Promise<StampActionResult> {
  const locale = await getLocale();
  const merchant = await requireMerchantProgram();
  const parsed = lookupSchema.safeParse({ query: formData.get("query") });
  if (!parsed.success) {
    return { error: translate(locale, "scanRequired") };
  }

  const q = parsed.data.query.toLowerCase();
  const pass = await prisma.pass.findFirst({
    where: {
      customer: { programId: merchant.program!.id },
      OR: [{ serial: parsed.data.query }, { customer: { email: q } }],
    },
    include: { customer: true },
  });

  if (!pass) {
    return { error: translate(locale, "cardNotFoundLookup") };
  }

  return {
    serial: pass.serial,
    name: pass.customer.name,
    email: pass.customer.email,
    stampCount: pass.stampCount,
    stampsRequired: merchant.program!.stampsRequired,
    rewardLabel: merchant.program!.rewardLabel,
    hasNewsletterOffer:
      pass.customer.marketingOptIn && !pass.customer.welcomeOfferRedeemed,
  };
}

export async function applyStampAction(formData: FormData): Promise<StampActionResult> {
  return mutatePass(formData, "stamp");
}

export async function redeemPassAction(formData: FormData): Promise<StampActionResult> {
  return mutatePass(formData, "redeem");
}

export async function redeemNewsletterOfferAction(
  formData: FormData,
): Promise<StampActionResult> {
  const locale = await getLocale();
  const merchant = await requireMerchantProgram();
  const serial = String(formData.get("serial") ?? "");
  const pass = await prisma.pass.findFirst({
    where: { serial, customer: { programId: merchant.program!.id } },
    include: { customer: true },
  });

  if (!pass) {
    return { error: translate(locale, "cardNotFound") };
  }
  if (!pass.customer.marketingOptIn || pass.customer.welcomeOfferRedeemed) {
    return { error: translate(locale, "welcomeUnavailable") };
  }

  await prisma.customer.update({
    where: { id: pass.customer.id },
    data: { welcomeOfferRedeemed: true },
  });
  revalidatePath("/stamp");
  revalidatePath(`/card/${pass.serial}`);

  return {
    serial: pass.serial,
    name: pass.customer.name,
    email: pass.customer.email,
    stampCount: pass.stampCount,
    stampsRequired: merchant.program!.stampsRequired,
    rewardLabel: merchant.program!.rewardLabel,
    hasNewsletterOffer: false,
  };
}

async function mutatePass(
  formData: FormData,
  type: StampEventType,
): Promise<StampActionResult> {
  const uiLocale = await getLocale();
  const merchant = await requireMerchantProgram();
  const serial = String(formData.get("serial") ?? "");
  const pass = await prisma.pass.findFirst({
    where: { serial, customer: { programId: merchant.program!.id } },
    include: { customer: true },
  });

  if (!pass) {
    return { error: translate(uiLocale, "cardNotFound") };
  }

  const required = merchant.program!.stampsRequired;
  let stampCount = pass.stampCount;
  let lastMessage = pass.lastMessage;
  let shouldEmailReward = false;
  const customerLocale: Locale = pass.customer.locale === "fr" ? "fr" : "en";

  switch (type) {
    case "stamp":
      if (stampCount >= required) {
        return { error: translate(uiLocale, "cardFull") };
      }
      stampCount += 1;
      lastMessage =
        stampCount >= required
          ? translate(customerLocale, "rewardReadyNote", { reward: merchant.program!.rewardLabel })
          : translate(customerLocale, "stampProgress", { count: stampCount, total: required });
      shouldEmailReward = stampCount >= required;
      break;
    case "redeem":
      if (stampCount < required) {
        return { error: translate(uiLocale, "notEnoughStamps") };
      }
      stampCount = 0;
      lastMessage = translate(customerLocale, "rewardRedeemed");
      break;
    case "adjust":
      return { error: translate(uiLocale, "manualAdjustUnavailable") };
    default:
      return assertNever(type);
  }

  await prisma.$transaction([
    prisma.pass.update({
      where: { id: pass.id },
      data: { stampCount, lastMessage },
    }),
    prisma.stampEvent.create({
      data: { passId: pass.id, type, staffId: merchant.userId },
    }),
  ]);

  await refreshWalletPass(pass.id);

  if (shouldEmailReward) {
    await sendEmail({
      to: pass.customer.email,
      subject: translate(customerLocale, "rewardSubject", { shop: merchant.name }),
      html: rewardReadyEmailHtml(merchant.name, merchant.program!.rewardLabel, customerLocale),
    });
  }

  revalidatePath("/stamp");
  revalidatePath("/dashboard");
  revalidatePath("/customers");

  return {
    serial: pass.serial,
    name: pass.customer.name,
    email: pass.customer.email,
    stampCount,
    stampsRequired: required,
    rewardLabel: merchant.program!.rewardLabel,
    hasNewsletterOffer:
      pass.customer.marketingOptIn && !pass.customer.welcomeOfferRedeemed,
  };
}
