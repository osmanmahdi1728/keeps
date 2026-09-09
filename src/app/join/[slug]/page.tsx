import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { JoinForm } from "@/components/JoinForm";
import { PassCard } from "@/components/PassCard";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    include: { program: true },
  });
  if (!merchant?.program) {
    notFound();
  }
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);

  return (
    <div className="mx-auto grid min-h-full max-w-4xl items-center gap-10 px-4 py-12 lg:grid-cols-2">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-stamp">{t("noApp")}</p>
        <h1 className="font-serif mt-3 text-5xl">{merchant.name}</h1>
        <p className="mt-4 text-lg text-muted">
          {t("joinDescription", {
            count: merchant.program.stampsRequired,
            reward: merchant.program.rewardLabel.toLowerCase(),
          })}
        </p>
        <div className="mt-8">
          <JoinForm slug={merchant.slug} shopName={merchant.name} />
        </div>
      </div>
      <PassCard
        merchantName={merchant.name}
        rewardLabel={merchant.program.rewardLabel}
        stampsRequired={merchant.program.stampsRequired}
        stampCount={0}
        serial="join-preview"
        logoUrl={merchant.logoUrl}
        backgroundColor={merchant.backgroundColor}
        primaryColor={merchant.primaryColor}
        accentColor={merchant.accentColor}
        gradientEnd={merchant.gradientEnd}
        fontFamily={merchant.fontFamily}
      />
    </div>
  );
}
