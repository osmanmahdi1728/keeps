import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CardLiveStatus } from "@/components/CardLiveStatus";
import { PassCard } from "@/components/PassCard";
import { SaveToPhone } from "@/components/SaveToPhone";
import { cardPageUrl } from "@/lib/card-url";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "@/lib/config";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ serial: string }>;
  searchParams: Promise<{ t?: string }>;
}): Promise<Metadata> {
  const { serial } = await params;
  const { t: token } = await searchParams;
  const pass = await prisma.pass.findUnique({
    where: { serial },
    include: { customer: { include: { program: { include: { merchant: true } } } } },
  });
  const name = pass?.customer.program.merchant.name ?? "Keeps";
  const locale = pass?.customer.locale === "fr" ? "fr" : "en";
  const manifest =
    token && pass && token === pass.authenticationToken
      ? `/card/${serial}/manifest?t=${encodeURIComponent(token)}`
      : undefined;
  return {
    title: `${name} — ${translate(locale, "stampCard")}`,
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: "black-translucent",
    },
    manifest,
    icons: [{ url: "/keeps-icon.svg", type: "image/svg+xml" }],
  };
}

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ serial: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { serial } = await params;
  const { t: token } = await searchParams;
  const pass = await prisma.pass.findUnique({
    where: { serial },
    include: {
      customer: { include: { program: { include: { merchant: true } } } },
    },
  });

  if (!pass || !token || token !== pass.authenticationToken) {
    notFound();
  }

  const merchant = pass.customer.program.merchant;
  const program = pass.customer.program;
  const cardUrl = cardPageUrl(pass.serial, pass.authenticationToken);
  const remaining = Math.max(program.stampsRequired - pass.stampCount, 0);
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-stamp">{t("yourCard")}</p>
      <h1 className="font-serif mt-2 text-center text-4xl">{merchant.name}</h1>
      <p className="mt-2 text-center text-muted">
        {remaining === 0 ? t("rewardReadyCounter") : t("stampsToGo", { count: remaining })}
      </p>
      <CardLiveStatus
        rewardReady={remaining === 0}
        rewardLabel={program.rewardLabel}
      />
      <div className="mt-6 w-full">
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
      {isAppleWalletConfigured() ? (
        <a className="btn btn-ghost mt-4 w-full" href={`/api/passes/apple/${pass.serial}`}>
          {t("alsoApple")}
        </a>
      ) : null}
      {isGoogleWalletConfigured() ? (
        <a className="btn btn-ghost mt-2 w-full" href={`/api/passes/google/${pass.serial}`}>
          {t("alsoGoogle")}
        </a>
      ) : null}
    </div>
  );
}
