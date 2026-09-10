import Link from "next/link";
import { WalletCardPreview } from "@/components/WalletCardPreview";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function HomePage() {
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <p className="font-serif text-3xl">Keeps</p>
        <div className="flex gap-3">
          <Link href="/login" className="btn btn-ghost">
            {t("merchantLogin")}
          </Link>
          <Link href="/join/demo-cafe" className="btn btn-primary">
            {t("tryCard")}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-stamp">{t("homeEyebrow")}</p>
            <h1 className="font-serif mt-4 max-w-xl text-6xl leading-[0.95]">
              {t("homeTitle")}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-7 text-muted">
              {t("homeBody")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-accent">
                {t("startShop")}
              </Link>
              <Link href="/join/demo-cafe" className="btn btn-ghost">
                {t("joinDemo")}
              </Link>
            </div>
          </div>
          <div>
            <WalletCardPreview
              platform="apple"
              merchantName="Northside Coffee"
              rewardLabel={t("previewReward")}
              stampsRequired={10}
              stampCount={4}
              backgroundColor="#214d3a"
              primaryColor="#f3eadc"
              accentColor="#c45c26"
            />
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-muted">
              <span className="rounded-full border border-line bg-card px-3 py-1.5">
                Apple Wallet
              </span>
              <span className="rounded-full border border-line bg-card px-3 py-1.5">
                Google Wallet
              </span>
            </div>
          </div>
        </section>
        <section className="grid gap-6 border-t border-line py-14 md:grid-cols-3">
          <Feature title={t("featureHomeTitle")} body={t("featureHomeBody")} />
          <Feature title={t("featureStampTitle")} body={t("featureStampBody")} />
          <Feature title={t("featureEmailTitle")} body={t("featureEmailBody")} />
        </section>
        <section className="border-t border-line py-14">
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-stamp">{t("homeWhoEyebrow")}</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Feature title={t("homeWhoSelfcare")} body={t("homeWhoSelfcareBody")} />
            <Feature title={t("homeWhoCrave")} body={t("homeWhoCraveBody")} />
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-3 text-muted">{body}</p>
    </div>
  );
}
