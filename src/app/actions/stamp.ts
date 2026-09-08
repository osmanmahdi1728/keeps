"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { assertNever, type StampEventType } from "@/lib/types";
import { refreshWalletPass } from "@/lib/wallet/update";
import { rewardReadyEmailHtml, sendEmail } from "@/lib/email/send";

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

export async function lookupPass(formData: FormData) {
  const merchant = await requireMerchantProgram();
  const parsed = lookupSchema.safeParse({ query: formData.get("query") });
  if (!parsed.success) {
    return { error: "Scan the card QR or type the customer email." as const };
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
    return { error: "No card found for that scan or email." as const };
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

export async function applyStampAction(formData: FormData) {
  return mutatePass(formData, "stamp");
}

export async function redeemPassAction(formData: FormData) {
  return mutatePass(formData, "redeem");
}

export async function redeemNewsletterOfferAction(formData: FormData) {
  const merchant = await requireMerchantProgram();
  const serial = String(formData.get("serial") ?? "");
  const pass = await prisma.pass.findFirst({
    where: { serial, customer: { programId: merchant.program!.id } },
    include: { customer: true },
  });

  if (!pass) {
    return { error: "Card not found." as const };
  }
  if (!pass.customer.marketingOptIn || pass.customer.welcomeOfferRedeemed) {
    return { error: "This 15% welcome offer is not available." as const };
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

async function mutatePass(formData: FormData, type: StampEventType) {
  const merchant = await requireMerchantProgram();
  const serial = String(formData.get("serial") ?? "");
  const pass = await prisma.pass.findFirst({
    where: { serial, customer: { programId: merchant.program!.id } },
    include: { customer: true },
  });

  if (!pass) {
    return { error: "Card not found." as const };
  }

  const required = merchant.program!.stampsRequired;
  let stampCount = pass.stampCount;
  let lastMessage = pass.lastMessage;
  let shouldEmailReward = false;

  switch (type) {
    case "stamp":
      if (stampCount >= required) {
        return { error: "Card is full. Redeem the reward first." as const };
      }
      stampCount += 1;
      lastMessage =
        stampCount >= required
          ? `Reward ready: ${merchant.program!.rewardLabel}`
          : `Stamp ${stampCount} of ${required}.`;
      shouldEmailReward = stampCount >= required;
      break;
    case "redeem":
      if (stampCount < required) {
        return { error: "Not enough stamps to redeem yet." as const };
      }
      stampCount = 0;
      lastMessage = "Reward redeemed. New card started.";
      break;
    case "adjust":
      return { error: "Manual adjust is not in this version." as const };
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
      subject: `Your ${merchant.name} reward is ready`,
      html: rewardReadyEmailHtml(merchant.name, merchant.program!.rewardLabel),
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
