import { NextResponse } from "next/server";
import { authenticateApplePass } from "@/lib/wallet/apple-auth";
import { createApplePkpass } from "@/lib/wallet/apple";
import { toPassModel } from "@/lib/wallet/update";
import {
  isAppleWalletConfigured,
  isExpectedApplePassType,
} from "@/lib/config";

export async function GET(
  request: Request,
  context: { params: Promise<{ passTypeId: string; serialNumber: string }> },
) {
  const { passTypeId, serialNumber } = await context.params;
  if (!isExpectedApplePassType(passTypeId)) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }
  const auth = await authenticateApplePass(request, serialNumber);
  if ("error" in auth) {
    return auth.error;
  }
  if (!isAppleWalletConfigured()) {
    return NextResponse.json({ error: "Apple Wallet demo mode" }, { status: 503 });
  }

  const merchant = auth.pass.customer.program.merchant;
  const program = auth.pass.customer.program;
  const buf = await createApplePkpass(
    toPassModel({
      serial: auth.pass.serial,
      authenticationToken: auth.pass.authenticationToken,
      stampCount: auth.pass.stampCount,
      lastMessage: auth.pass.lastMessage,
      merchantName: merchant.name,
      rewardLabel: program.rewardLabel,
      stampsRequired: program.stampsRequired,
      backgroundColor: merchant.backgroundColor,
      primaryColor: merchant.primaryColor,
      logoUrl: merchant.logoUrl,
      locale: auth.pass.customer.locale === "fr" ? "fr" : "en",
    }),
  );

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": auth.pass.updatedAt.toUTCString(),
    },
  });
}
