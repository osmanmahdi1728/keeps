import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { JoinForm } from "@/components/JoinForm";
import { PassCard } from "@/components/PassCard";
import { fontCss } from "@/lib/card-design";

export default async function ShopSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    include: { program: true },
  });
  if (!merchant?.program || !merchant.sitePublished) {
    notFound();
  }

  const program = merchant.program;
  const displayFont = fontCss(merchant.fontFamily);
  const template = merchant.siteTemplate;
  const instagram = merchant.instagram ? `https://instagram.com/${merchant.instagram}` : null;

  return (
    <div
      className="min-h-full"
      style={{
        background: `linear-gradient(160deg, ${merchant.backgroundColor}, ${merchant.gradientEnd})`,
        color: merchant.primaryColor,
        fontFamily: displayFont,
      }}
    >
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-3">
          {merchant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={merchant.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : null}
          <p className="text-xl">{merchant.name}</p>
        </div>
        <a href="#card" className="btn btn-primary" style={{ background: merchant.primaryColor, color: merchant.backgroundColor }}>
          Get the card
        </a>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        <section className={template === "studio" ? "max-w-2xl py-10" : "grid items-center gap-10 py-10 lg:grid-cols-2"}>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: merchant.accentColor }}>
              {merchant.neighborhood || merchant.siteKind}
            </p>
            <h1 className="mt-3 text-5xl leading-[0.95]">{merchant.tagline || merchant.name}</h1>
            <p className="mt-5 max-w-xl text-lg leading-7 opacity-80">
              {merchant.about || program.description || `${merchant.name} — ${program.rewardLabel} after ${program.stampsRequired} stamps.`}
            </p>
            <p className="mt-4 text-sm opacity-70">{merchant.hours}</p>
            {instagram ? (
              <a className="mt-4 inline-block text-sm underline" href={instagram}>
                Instagram
              </a>
            ) : null}
          </div>
          {template !== "board" ? (
            <PassCard
              merchantName={merchant.name}
              rewardLabel={program.rewardLabel}
              stampsRequired={program.stampsRequired}
              stampCount={3}
              serial="site-preview"
              logoUrl={merchant.logoUrl}
              backgroundColor={merchant.backgroundColor}
              primaryColor={merchant.primaryColor}
              accentColor={merchant.accentColor}
              gradientEnd={merchant.gradientEnd}
              fontFamily={merchant.fontFamily}
            />
          ) : null}
        </section>

        <section id="card" className="rounded-[28px] bg-white/70 p-6 backdrop-blur md:p-10">
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl">Your stamp card</h2>
              <p className="mt-3 opacity-80">
                Collect {program.stampsRequired}, then {program.rewardLabel.toLowerCase()}. No extra app.
              </p>
              <div className="mt-6">
                <JoinForm slug={merchant.slug} shopName={merchant.name} />
              </div>
            </div>
            {template === "board" ? (
              <PassCard
                merchantName={merchant.name}
                rewardLabel={program.rewardLabel}
                stampsRequired={program.stampsRequired}
                stampCount={0}
                serial="site-preview"
                logoUrl={merchant.logoUrl}
                backgroundColor={merchant.backgroundColor}
                primaryColor={merchant.primaryColor}
                accentColor={merchant.accentColor}
                gradientEnd={merchant.gradientEnd}
                fontFamily={merchant.fontFamily}
              />
            ) : (
              <p className="text-sm opacity-70">
                After you join, save the card to your home screen and show it at the counter.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
