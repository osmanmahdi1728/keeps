import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isGoogleWalletConfigured } from "@/lib/config";
import { createGoogleSaveJwt, googleSaveUrl, upsertGoogleLoyalty } from "@/lib/wallet/google";
import { toPassModel } from "@/lib/wallet/update";

export async function GET(
  _request: Request,
  context: { params: Promise<{ serial: string }> },
) {
  const { serial } = await context.params;
  if (!isGoogleWalletConfigured()) {
    return NextResponse.json({ error: "Google Wallet is not configured yet." }, { status: 503 });
  }

  const pass = await prisma.pass.findUnique({
    where: { serial },
    include: { customer: { include: { program: { include: { merchant: true } } } } },
  });
  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  const merchant = pass.customer.program.merchant;
  const program = pass.customer.program;
  const model = toPassModel({
    serial: pass.serial,
    authenticationToken: pass.authenticationToken,
    stampCount: pass.stampCount,
    lastMessage: pass.lastMessage,
    merchantName: merchant.name,
    rewardLabel: program.rewardLabel,
    stampsRequired: program.stampsRequired,
    backgroundColor: merchant.backgroundColor,
    primaryColor: merchant.primaryColor,
    logoUrl: merchant.logoUrl,
  });

  await upsertGoogleLoyalty(model, program.id);
  const jwt = await createGoogleSaveJwt(model);
  return NextResponse.redirect(googleSaveUrl(jwt));
}
