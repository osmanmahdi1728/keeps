import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { JoinForm } from "@/components/JoinForm";
import { WalletCardPreview } from "@/components/WalletCardPreview";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { inferJoinPlatform } from "@/lib/wallet/apple";

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    include: { program: true },
  });
  if (!merchant?.program) {
    notFound();
  }
  const platform = inferJoinPlatform((await headers()).get("user-agent"));
  const previewPlatform = platform === "google" ? "google" : "apple";
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);

  return (
    <div className="mx-auto grid min-h-full max-w-4xl items-center gap-10 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="order-2 lg:order-1">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-stamp">
          {t("noApp")}
        </p>
        <h1 className="font-serif mt-3 text-4xl">{t("joinCardTitle", { shop: merchant.name })}</h1>
        <p className="mt-3 text-muted">
          {t("joinDescription", {
            count: merchant.program.stampsRequired,
            reward: merchant.program.rewardLabel.toLowerCase(),
          })}
        </p>
        <div className="mt-8">
          <JoinForm slug={merchant.slug} shopName={merchant.name} />
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <WalletCardPreview
          platform={previewPlatform}
          merchantName={merchant.name}
          rewardLabel={merchant.program.rewardLabel}
          stampsRequired={merchant.program.stampsRequired}
          stampCount={0}
          logoUrl={merchant.logoUrl}
          backgroundColor={merchant.backgroundColor}
          primaryColor={merchant.primaryColor}
          accentColor={merchant.accentColor}
        />
        <p className="mt-4 text-center text-xs text-muted">
          {t("walletPreviewDisclaimer")}
        </p>
      </div>
    </div>
  );
}
