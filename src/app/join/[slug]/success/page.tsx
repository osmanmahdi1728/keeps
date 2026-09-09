import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PassCard } from "@/components/PassCard";
import { SaveToPhone } from "@/components/SaveToPhone";
import { cardPageUrl } from "@/lib/card-url";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "@/lib/config";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function JoinSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ serial?: string; t?: string }>;
}) {
  const { slug } = await params;
  const { serial, t: tokenParam } = await searchParams;
  if (!serial) {
    notFound();
  }

  const pass = await prisma.pass.findUnique({
    where: { serial },
    include: {
      customer: {
        include: { program: { include: { merchant: true } } },
      },
    },
  });

  if (!pass || pass.customer.program.merchant.slug !== slug) {
    notFound();
  }

  const token =
    tokenParam && tokenParam === pass.authenticationToken
      ? tokenParam
      : pass.authenticationToken;
  const merchant = pass.customer.program.merchant;
  const program = pass.customer.program;
  const appleReady = isAppleWalletConfigured();
  const googleReady = isGoogleWalletConfigured();
  const cardUrl = cardPageUrl(pass.serial, token);
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center px-4 py-12 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-stamp">{t("youreIn")}</p>
      <h1 className="font-serif mt-3 text-4xl">{t("keepCard")}</h1>
      <p className="mt-3 text-muted">
        {t("successBody")}
      </p>
      {pass.customer.marketingOptIn && !pass.customer.welcomeOfferRedeemed ? (
        <div className="mt-5 w-full rounded-xl border border-stamp bg-card px-4 py-4">
          <p className="font-serif text-2xl text-stamp">{t("welcomeOffer")}</p>
          <p className="mt-1 text-sm text-muted">{t("welcomeOfferHelp")}</p>
        </div>
      ) : null}
      <div className="mt-8 w-full">
        <PassCard
          merchantName={merchant.name}
          rewardLabel={program.rewardLabel}
          stampsRequired={program.stampsRequired}
          stampCount={pass.stampCount}
          serial={pass.serial}
          logoUrl={merchant.logoUrl}
          backgroundColor={merchant.backgroundColor}
          primaryColor={merchant.primaryColor}
          accentColor={merchant.accentColor}
          gradientEnd={merchant.gradientEnd}
          fontFamily={merchant.fontFamily}
          lastMessage={pass.lastMessage}
        />
      </div>
      <div className="mt-8 w-full">
        <SaveToPhone cardUrl={cardUrl} shopName={merchant.name} />
      </div>
      <Link href={`/card/${pass.serial}?t=${encodeURIComponent(token)}`} className="btn btn-ghost mt-3 w-full">
        {t("openFullscreen")}
      </Link>
      <div className="mt-6 flex w-full flex-col gap-2">
        {appleReady ? (
          <a className="btn btn-ghost" href={`/api/passes/apple/${pass.serial}`}>
            {t("addApple")}
          </a>
        ) : null}
        {googleReady ? (
          <a className="btn btn-ghost" href={`/api/passes/google/${pass.serial}`}>
            {t("addGoogle")}
          </a>
        ) : (
          <p className="text-sm text-muted">
            {t("walletsLater")}
          </p>
        )}
      </div>
      <Link href={`/join/${slug}`} className="mt-8 text-sm text-muted underline">
        {t("joinAnother")}
      </Link>
    </div>
  );
}
