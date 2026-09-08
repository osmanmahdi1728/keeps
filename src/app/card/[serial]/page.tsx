import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CardLiveStatus } from "@/components/CardLiveStatus";
import { PassCard } from "@/components/PassCard";
import { SaveToPhone } from "@/components/SaveToPhone";
import { cardPageUrl } from "@/lib/card-url";
import { isAppleWalletConfigured, isGoogleWalletConfigured } from "@/lib/config";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ serial: string }>;
  searchParams: Promise<{ t?: string }>;
}): Promise<Metadata> {
  const { serial } = await params;
  const { t } = await searchParams;
  const pass = await prisma.pass.findUnique({
    where: { serial },
    include: { customer: { include: { program: { include: { merchant: true } } } } },
  });
  const name = pass?.customer.program.merchant.name ?? "Keeps";
  const manifest =
    t && pass && t === pass.authenticationToken
      ? `/card/${serial}/manifest?t=${encodeURIComponent(t)}`
      : undefined;
  return {
    title: `${name} stamp card`,
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
  const { t } = await searchParams;
  const pass = await prisma.pass.findUnique({
    where: { serial },
    include: {
      customer: { include: { program: { include: { merchant: true } } } },
    },
  });

  if (!pass || !t || t !== pass.authenticationToken) {
    notFound();
  }

  const merchant = pass.customer.program.merchant;
  const program = pass.customer.program;
  const cardUrl = cardPageUrl(pass.serial, pass.authenticationToken);
  const remaining = Math.max(program.stampsRequired - pass.stampCount, 0);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-stamp">Your card</p>
      <h1 className="font-serif mt-2 text-center text-4xl">{merchant.name}</h1>
      <p className="mt-2 text-center text-muted">
        {remaining === 0 ? "Reward ready — show this at the counter." : `${remaining} stamp${remaining === 1 ? "" : "s"} to go.`}
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
          Also add to Apple Wallet
        </a>
      ) : null}
      {isGoogleWalletConfigured() ? (
        <a className="btn btn-ghost mt-2 w-full" href={`/api/passes/google/${pass.serial}`}>
          Also add to Google Wallet
        </a>
      ) : null}
    </div>
  );
}
