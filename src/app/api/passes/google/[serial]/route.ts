import { NextResponse } from "next/server";
import { isGoogleWalletConfigured } from "@/lib/config";
import { createGoogleSaveJwt, googleSaveUrl, upsertGoogleLoyalty } from "@/lib/wallet/google";
import { authenticatePassDownload } from "@/lib/wallet/pass-download-auth";
import { toPassModel } from "@/lib/wallet/update";

export async function GET(
  request: Request,
  context: { params: Promise<{ serial: string }> },
) {
  const { serial } = await context.params;
  if (!isGoogleWalletConfigured()) {
    return NextResponse.json({ error: "Google Wallet is not configured yet." }, { status: 503 });
  }

  const auth = await authenticatePassDownload(request, serial);
  if ("error" in auth) {
    return auth.error;
  }

  const pass = auth.pass;
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
    locale: pass.customer.locale === "fr" ? "fr" : "en",
  });

  await upsertGoogleLoyalty(model, program.id);
  const jwt = await createGoogleSaveJwt(model);
  return NextResponse.redirect(googleSaveUrl(jwt));
}
