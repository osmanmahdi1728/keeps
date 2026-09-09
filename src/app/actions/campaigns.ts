"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { assertNever, type CampaignChannel } from "@/lib/types";
import { refreshWalletPass } from "@/lib/wallet/update";
import { campaignEmailHtml, sendEmail } from "@/lib/email/send";
import { getLocale, translate } from "@/lib/i18n";

const campaignSchema = z.object({
  channel: z.enum(["wallet", "email"]),
  subject: z.string().trim().max(120).optional(),
  body: z.string().trim().min(8).max(500),
});

export async function sendCampaign(formData: FormData): Promise<{ error: string } | { sent: number }> {
  const locale = await getLocale();
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = campaignSchema.safeParse({
    channel: formData.get("channel"),
    subject: formData.get("subject") || undefined,
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: translate(locale, "campaignInvalid") };
  }

  const merchant = await prisma.merchant.findUnique({
    where: { userId: session.user.id },
    include: { program: true },
  });
  if (!merchant?.program) {
    redirect("/onboarding");
  }

  const channel: CampaignChannel = parsed.data.channel;
  if (channel === "email" && !parsed.data.subject) {
    return { error: translate(locale, "campaignSubjectRequired") };
  }

  const campaign = await prisma.campaign.create({
    data: {
      programId: merchant.program.id,
      channel,
      subject: parsed.data.subject ?? null,
      body: parsed.data.body,
      status: "sending",
    },
  });

  let sent = 0;

  switch (channel) {
    case "wallet": {
      const passes = await prisma.pass.findMany({
        where: { customer: { programId: merchant.program.id } },
      });
      for (const pass of passes) {
        await prisma.pass.update({
          where: { id: pass.id },
          data: { lastMessage: parsed.data.body },
        });
        await refreshWalletPass(pass.id);
        sent += 1;
      }
      break;
    }
    case "email": {
      const customers = await prisma.customer.findMany({
        where: { programId: merchant.program.id, marketingOptIn: true },
      });
      for (const customer of customers) {
        await sendEmail({
          to: customer.email,
          subject: parsed.data.subject ?? merchant.name,
          html: campaignEmailHtml(
            merchant.name,
            parsed.data.body,
            customer.unsubscribeToken,
            customer.locale === "fr" ? "fr" : "en",
          ),
        });
        sent += 1;
      }
      break;
    }
    default:
      return assertNever(channel);
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "sent", sentCount: sent, sentAt: new Date() },
  });

  revalidatePath("/campaigns");
  return { sent };
}

export async function unsubscribeByToken(token: string): Promise<void> {
  await prisma.customer.updateMany({
    where: { unsubscribeToken: token },
    data: { marketingOptIn: false },
  });
}
