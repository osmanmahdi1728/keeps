import { prisma } from "@/lib/db";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "@/lib/config";
import { sendApplePush, type WalletPassModel } from "@/lib/wallet/apple";
import { notifyGoogleObject, upsertGoogleLoyalty } from "@/lib/wallet/google";

export function toPassModel(input: {
  serial: string;
  authenticationToken: string;
  stampCount: number;
  lastMessage: string | null;
  merchantName: string;
  rewardLabel: string;
  stampsRequired: number;
  backgroundColor: string;
  primaryColor: string;
  logoUrl: string | null;
}): WalletPassModel {
  return {
    serial: input.serial,
    authenticationToken: input.authenticationToken,
    stampCount: input.stampCount,
    lastMessage: input.lastMessage,
    merchantName: input.merchantName,
    rewardLabel: input.rewardLabel,
    stampsRequired: input.stampsRequired,
    backgroundColor: input.backgroundColor,
    primaryColor: input.primaryColor,
    logoUrl: input.logoUrl,
  };
}

export async function refreshWalletPass(passId: string): Promise<void> {
  const pass = await prisma.pass.findUnique({
    where: { id: passId },
    include: {
      appleRegistrations: true,
      customer: {
        include: {
          program: { include: { merchant: true } },
        },
      },
    },
  });

  if (!pass) {
    return;
  }

  const model = toPassModel({
    serial: pass.serial,
    authenticationToken: pass.authenticationToken,
    stampCount: pass.stampCount,
    lastMessage: pass.lastMessage,
    merchantName: pass.customer.program.merchant.name,
    rewardLabel: pass.customer.program.rewardLabel,
    stampsRequired: pass.customer.program.stampsRequired,
    backgroundColor: pass.customer.program.merchant.backgroundColor,
    primaryColor: pass.customer.program.merchant.primaryColor,
    logoUrl: pass.customer.program.merchant.logoUrl,
  });

  if (pass.platform === "google" && isGoogleWalletConfigured()) {
    const googleId = await upsertGoogleLoyalty(model, pass.customer.programId);
    await notifyGoogleObject(model, pass.customer.programId);
    if (googleId !== pass.googleObjectId) {
      await prisma.pass.update({
        where: { id: pass.id },
        data: { googleObjectId: googleId },
      });
    }
    return;
  }

  if (pass.platform === "apple" && isAppleWalletConfigured()) {
    await Promise.all(pass.appleRegistrations.map((reg) => sendApplePush(reg.pushToken)));
  }
}
