import { CampaignForm } from "@/components/CampaignForm";
import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/guards";
import { getLocale, translate } from "@/lib/i18n";

export default async function CampaignsPage() {
  const merchant = await requireMerchant();
  if (!merchant.program) {
    return null;
  }

  const [optedInCount, campaigns] = await Promise.all([
    prisma.customer.count({ where: { programId: merchant.program.id, marketingOptIn: true } }),
    prisma.campaign.findMany({
      where: { programId: merchant.program.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="font-serif text-4xl">{t("campaigns")}</h1>
        <p className="mt-2 max-w-xl text-muted">
          {t("campaignsHelp")}
        </p>
        <div className="mt-8">
          <CampaignForm optedInCount={optedInCount} />
        </div>
      </div>
      <aside>
        <h2 className="font-serif text-2xl">{t("recent")}</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {campaigns.length === 0 ? <li className="text-muted">{t("noCampaigns")}</li> : null}
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="rounded-xl border border-line bg-card p-3">
              <p className="font-semibold capitalize">{campaign.channel}</p>
              <p className="mt-1 text-muted">{campaign.body}</p>
              <p className="mt-2 text-xs text-muted">
                {campaign.status} · {campaign.sentCount} {t("sent")}
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
