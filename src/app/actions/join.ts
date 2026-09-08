"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSerial, createToken } from "@/lib/ids";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "@/lib/config";
import { defaultAuthToken, inferJoinPlatform } from "@/lib/wallet/apple";
import { toPassModel } from "@/lib/wallet/update";
import { upsertGoogleLoyalty } from "@/lib/wallet/google";
import { sendEmail, welcomeEmailHtml } from "@/lib/email/send";
import { cardPageUrl } from "@/lib/card-url";

const joinSchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120),
  marketingOptIn: z.boolean(),
});

export async function joinProgram(formData: FormData): Promise<{ error: string } | undefined> {
  const parsed = joinSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").toLowerCase(),
    marketingOptIn: formData.get("marketingOptIn") === "on",
  });

  if (!parsed.success) {
    return { error: "Enter your name and a valid email." };
  }

  const merchant = await prisma.merchant.findUnique({
    where: { slug: parsed.data.slug },
    include: { program: true },
  });
  if (!merchant?.program) {
    return { error: "This shop is not accepting cards right now." };
  }

  const headerList = await headers();
  const platform = inferJoinPlatform(headerList.get("user-agent"));
  const resolvedPlatform =
    platform === "apple" && !isAppleWalletConfigured()
      ? "demo"
      : platform === "google" && !isGoogleWalletConfigured()
        ? "demo"
        : platform;

  const customer = await prisma.customer.upsert({
    where: {
      programId_email: {
        programId: merchant.program.id,
        email: parsed.data.email,
      },
    },
    update: {
      name: parsed.data.name,
      marketingOptIn: parsed.data.marketingOptIn,
    },
    create: {
      programId: merchant.program.id,
      email: parsed.data.email,
      name: parsed.data.name,
      marketingOptIn: parsed.data.marketingOptIn,
      unsubscribeToken: createToken(),
    },
    include: { passes: true },
  });

  let pass = customer.passes[0];
  if (!pass) {
    pass = await prisma.pass.create({
      data: {
        customerId: customer.id,
        serial: createSerial(),
        platform: resolvedPlatform,
        authenticationToken: defaultAuthToken(),
      },
    });
  }

  if (pass.platform === "google" && isGoogleWalletConfigured()) {
    const googleId = await upsertGoogleLoyalty(
      toPassModel({
        serial: pass.serial,
        authenticationToken: pass.authenticationToken,
        stampCount: pass.stampCount,
        lastMessage: pass.lastMessage,
        merchantName: merchant.name,
        rewardLabel: merchant.program.rewardLabel,
        stampsRequired: merchant.program.stampsRequired,
        backgroundColor: merchant.backgroundColor,
        primaryColor: merchant.primaryColor,
        logoUrl: merchant.logoUrl,
      }),
      merchant.program.id,
    );
    await prisma.pass.update({
      where: { id: pass.id },
      data: { googleObjectId: googleId },
    });
  }

  await sendEmail({
    to: customer.email,
    subject: `Your ${merchant.name} stamp card`,
    html: welcomeEmailHtml(
      merchant.name,
      cardPageUrl(pass.serial, pass.authenticationToken),
      customer.marketingOptIn && !customer.welcomeOfferRedeemed,
    ),
  });

  redirect(
    `/join/${merchant.slug}/success?serial=${pass.serial}&t=${encodeURIComponent(pass.authenticationToken)}`,
  );
}
