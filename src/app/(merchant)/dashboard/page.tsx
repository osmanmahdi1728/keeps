import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/guards";
import { appUrl } from "@/lib/ids";
import { daysAgo } from "@/lib/clock";
import { isAppleWalletConfigured, isGoogleWalletConfigured, isResendConfigured } from "@/lib/config";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

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

  const joinUrl = `${appUrl()}/join/${merchant.slug}`;
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-stamp">{t("todayAt", { shop: merchant.name })}</p>
        <h1 className="font-serif mt-2 text-4xl">{t("dashboardTitle")}</h1>
      </div>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("cardsIssued")} value={String(customers)} />
        <Stat label={t("stampsWeek")} value={String(stamps)} />
        <Stat label={t("rewardsRedeemed")} value={String(redemptions)} />
      </section>
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-serif text-2xl">{t("joinQr")}</h2>
        <p className="mt-2 max-w-xl text-muted">
          {t("joinQrHelp")}
        </p>
        <p className="mt-4 break-all font-mono text-sm">{joinUrl}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/join/${merchant.slug}`} alt="Join QR" className="mt-4 h-40 w-40 bg-white p-2" />
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="btn btn-primary" href="/stamp">
            {t("openStampPad")}
          </Link>
          <Link className="btn btn-ghost" href="/website">
            {t("shopWebsite")}
          </Link>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-card p-6">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-stamp">
          How the café uses Keeps
        </p>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          <WorkflowStep
            number="1"
            title="Owner"
            body="Opens this dashboard on any web browser to edit the card, see customers, and send offers."
          />
          <WorkflowStep
            number="2"
            title="Counter staff"
            body="Keeps the Stamp page open on a café phone or tablet. Scan the customer card or search their email."
          />
          <WorkflowStep
            number="3"
            title="Customer"
            body="Scans the printed join QR once. Their saved card updates automatically while it is open."
          />
        </div>
      </section>
      <section className="grid gap-3 text-sm text-muted">
        <Status ok={isAppleWalletConfigured()} label="Apple Wallet signing" />
        <Status ok={isGoogleWalletConfigured()} label="Google Wallet issuer" />
        <Status ok={isResendConfigured()} label="Resend email" />
        <p>Missing credentials stay in demo mode: cards still work on the join page so you can sell the product locally.</p>
      </section>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
        {number}
      </span>
      <h3 className="font-serif mt-3 text-xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
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

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p>
      <span className={ok ? "text-forest" : "text-stamp"}>{ok ? "Ready" : "Demo"}</span>
      {" — "}
      {label}
    </p>
  );
}
