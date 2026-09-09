import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createApplePkpass } from "@/lib/wallet/apple";
import { isAppleWalletConfigured } from "@/lib/config";
import { toPassModel } from "@/lib/wallet/update";

export async function GET(
  _request: Request,
  context: { params: Promise<{ serial: string }> },
) {
  const { serial } = await context.params;
  if (!isAppleWalletConfigured()) {
    return NextResponse.json({ error: "Apple Wallet is not configured yet." }, { status: 503 });
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
  const buf = await createApplePkpass(
    toPassModel({
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
      locale: pass.customer.locale === "fr" ? "fr" : "en",
    }),
  );

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${pass.serial}.pkpass"`,
    },
  });
}
