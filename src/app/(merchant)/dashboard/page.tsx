import Link from "next/link";
import { WalletCardPreview } from "@/components/WalletCardPreview";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/guards";
import { appUrl } from "@/lib/ids";
import { daysAgo } from "@/lib/clock";
import {
  appleWalletReadiness,
  emailReadiness,
  googleWalletReadiness,
} from "@/lib/config";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { customerEntryPath } from "@/lib/site";

export default async function DashboardPage() {
  const merchant = await requireMerchant();
  const program = merchant.program;
  if (!program) {
    return null;
  }

  const weekAgo = daysAgo(7);
  const [customers, stamps, redemptions] = await Promise.all([
    prisma.customer.count({ where: { programId: program.id } }),
    prisma.stampEvent.count({
      where: { type: "stamp", pass: { customer: { programId: program.id } }, createdAt: { gte: weekAgo } },
    }),
    prisma.stampEvent.count({
      where: { type: "redeem", pass: { customer: { programId: program.id } } },
    }),
  ]);

  const joinUrl = `${appUrl()}${customerEntryPath(merchant.slug)}`;
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);
  const apple = appleWalletReadiness();
  const google = googleWalletReadiness();
  const email = emailReadiness();

  return (
    <div className="space-y-8">
      <section className="grid items-center gap-8 rounded-[2rem] bg-forest p-6 text-paper shadow-[0_24px_70px_rgba(28,25,20,0.18)] lg:grid-cols-[1fr_22rem] lg:p-9">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-paper/65">
            {t("todayAt", { shop: merchant.name })}
          </p>
          <h1 className="font-serif mt-3 max-w-xl text-5xl leading-[0.95]">
            {t("walletDashboardTitle")}
          </h1>
          <p className="mt-4 max-w-lg text-paper/70">
            {t("walletDashboardHelp")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn bg-paper text-ink" href="/program">
              {t("designCard")}
            </Link>
            <Link className="btn border border-paper/30 text-paper" href="/stamp">
              {t("openStampPad")}
            </Link>
            <Link className="btn border border-paper/30 text-paper" href="/campaigns">
              {t("sendCampaign")}
            </Link>
          </div>
        </div>
        <WalletCardPreview
          platform="apple"
          merchantName={merchant.name}
          rewardLabel={program.rewardLabel}
          stampsRequired={program.stampsRequired}
          stampCount={3}
          logoUrl={merchant.logoUrl}
          backgroundColor={merchant.backgroundColor}
          primaryColor={merchant.primaryColor}
          accentColor={merchant.accentColor}
        />
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("cardsIssued")} value={String(customers)} />
        <Stat label={t("stampsWeek")} value={String(stamps)} />
        <Stat label={t("rewardsRedeemed")} value={String(redemptions)} />
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-2xl border border-line bg-card p-6">
          <h2 className="font-serif text-2xl">{t("joinQr")}</h2>
          <p className="mt-2 max-w-xl text-muted">{t("directJoinQrHelp")}</p>
          <p className="mt-4 break-all font-mono text-sm">{joinUrl}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href={`/join/${merchant.slug}`}>
              {t("testEnrollment")}
            </Link>
            <a
              className="btn btn-ghost"
              href={`/api/qr/join/${merchant.slug}`}
              download={`${merchant.slug}-wallet-qr.png`}
            >
              {t("downloadQr")}
            </a>
          </div>
        </div>
        <div className="flex items-center justify-center rounded-2xl border border-line bg-white p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/qr/join/${merchant.slug}`} alt={t("joinQr")} className="h-48 w-48" />
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-serif text-2xl">{t("launchReadiness")}</h2>
        <p className="mt-2 text-sm text-muted">{t("launchReadinessHelp")}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Status ok={apple.ready} label="Apple Wallet" t={t} />
          <Status
            ok={google.ready && google.publishing === "live"}
            label="Google Wallet"
            detail={
              google.ready && google.publishing === "demo"
                ? t("googleDemoMode")
                : undefined
            }
            t={t}
          />
          <Status ok={email.ready} label={t("emailCampaigns")} t={t} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-xs tracking-[0.16em] uppercase text-muted">{label}</p>
      <p className="font-serif mt-2 text-4xl">{value}</p>
    </div>
  );
}

function Status({
  ok,
  label,
  detail,
  t,
}: {
  ok: boolean;
  label: string;
  detail?: string;
  t: (key: Parameters<typeof translate>[1]) => string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <span className={ok ? "text-forest" : "text-stamp"}>
        {ok ? t("ready") : t("setupNeeded")}
      </span>
      <p className="mt-1 font-semibold">{label}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
