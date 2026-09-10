import { NextResponse } from "next/server";
import { createApplePkpass } from "@/lib/wallet/apple";
import { isAppleWalletConfigured } from "@/lib/config";
import { authenticatePassDownload } from "@/lib/wallet/pass-download-auth";
import { toPassModel } from "@/lib/wallet/update";

export async function GET(
  request: Request,
  context: { params: Promise<{ serial: string }> },
) {
  const { serial } = await context.params;
  if (!isAppleWalletConfigured()) {
    return NextResponse.json({ error: "Apple Wallet is not configured yet." }, { status: 503 });
  }

  const auth = await authenticatePassDownload(request, serial);
  if ("error" in auth) {
    return auth.error;
  }

  const pass = auth.pass;
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
