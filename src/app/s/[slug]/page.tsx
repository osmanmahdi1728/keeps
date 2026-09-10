import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JoinForm } from "@/components/JoinForm";
import { PassCard } from "@/components/PassCard";
import { fontCss } from "@/lib/card-design";
import { normalizedPlaceSchema } from "@/lib/google-places";
import { appUrl } from "@/lib/ids";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { loadSiteBySlug } from "@/lib/site-data";
import { bookingLabel, siteKindFamily } from "@/lib/site-kinds";
import { parseStoredSiteMedia } from "@/lib/site-migrate";
import {
  localize,
  type SiteLocale,
  type SiteMedia,
  type SiteMenuItem,
  type SiteSection,
} from "@/lib/site-sections";
import { assertNever } from "@/lib/types";

type ShopPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: ShopPageProps): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadSiteBySlug(slug);
  if (!loaded?.merchant.program || !loaded.merchant.sitePublished) {
    return {};
  }
  const locale = await getLocale();
  const hero = loaded.siteData.sections.find(
    (section) => section.content.type === "hero",
  );
  const title =
    hero?.content.type === "hero"
      ? localize(hero.content.title, locale)
      : loaded.merchant.name;
  const description =
    hero?.content.type === "hero"
      ? localize(hero.content.body, locale)
      : loaded.merchant.program.description ?? "";
  const media = parseStoredSiteMedia(loaded.merchant.siteMedia);
  const firstImage = media.find(
    (item): item is Extract<SiteMedia, { kind: "image" }> =>
      item.kind === "image",
  );
  const canonical = `${appUrl()}/s/${slug}`;

  return {
    title: `${title} — ${loaded.merchant.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: firstImage ? [{ url: firstImage.url, alt: firstImage.alt[locale] }] : [],
    },
  };
}

function safeExternalUrl(
  value: string | undefined,
  kind: "general" | "instagram" | "maps" = "general",
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("@") ? `https://instagram.com/${value.slice(1)}` : value);
    if (url.protocol !== "https:") return null;
    const hostname = url.hostname.toLowerCase();
    if (
      kind === "instagram" &&
      !["instagram.com", "www.instagram.com"].includes(hostname)
    ) {
      return null;
    }
    if (
      kind === "maps" &&
      ![
        "google.com",
        "www.google.com",
        "maps.google.com",
        "maps.app.goo.gl",
      ].includes(hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    if (kind === "instagram" && /^[a-z0-9._]{1,30}$/i.test(value)) {
      return `https://instagram.com/${value}`;
    }
    return null;
  }
}

function MenuGrid({
  items,
  locale,
  showPrices,
}: {
  items: SiteMenuItem[];
  locale: SiteLocale;
  showPrices: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-8 grid gap-3 md:grid-cols-2">
      {items.filter((item) => item.available).map((item) => (
        <article key={item.key} className="rounded-2xl border border-current/10 bg-white/55 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold">{localize(item.name, locale)}</h3>
            {showPrices && item.priceCents !== null ? (
              <span className="text-sm font-semibold">
                {new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
                  style: "currency",
                  currency: item.currency,
                }).format(item.priceCents / 100)}
              </span>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-2 text-sm leading-6 opacity-70">
              {localize(item.description, locale)}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ImageGallery({ media, locale }: { media: SiteMedia[]; locale: SiteLocale }) {
  const images = media.filter(
    (item): item is Extract<SiteMedia, { kind: "image" }> =>
      item.kind === "image",
  );
  if (images.length === 0) return null;
  return (
    <section className="py-14" aria-label={locale === "fr" ? "Galerie" : "Gallery"}>
      <div className="grid auto-rows-[12rem] grid-cols-2 gap-3 md:grid-cols-4">
        {images.slice(0, 6).map((image, index) => (
          <figure
            key={image.key}
            className={`group relative overflow-hidden rounded-3xl ${index === 0 ? "col-span-2 row-span-2" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={localize(image.alt, locale)}
              className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
            />
            {image.metadata?.attribution?.length ? (
              <figcaption className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-[10px] text-white">
                {image.metadata.attribution.map((item, attributionIndex) => (
                  <span key={`${item.name}-${attributionIndex}`}>
                    {attributionIndex > 0 ? ", " : ""}
                    {safeExternalUrl(item.uri, "maps") ? (
                      <a className="underline" href={safeExternalUrl(item.uri, "maps")!} target="_blank" rel="noreferrer">
                        {item.name}
                      </a>
                    ) : item.name}
                  </span>
                ))}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
      {images.some((image) => image.metadata?.source === "google") ? (
        <p className="mt-3 text-right text-[11px] opacity-60">
          {locale === "fr" ? "Photos fournies par Google" : "Photos provided by Google"}
        </p>
      ) : null}
    </section>
  );
}

function ContentSection({
  section,
  locale,
  menuItems,
  bookingText,
}: {
  section: SiteSection;
  locale: SiteLocale;
  menuItems: SiteMenuItem[];
  bookingText: string;
}) {
  const content = section.content;
  switch (content.type) {
    case "hero":
    case "loyalty":
      return null;
    case "about":
      return (
        <section id="about" className="grid gap-8 py-16 md:grid-cols-[0.7fr_1.3fr]">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-55">01 — Story</p>
          <div>
            <h2 className="max-w-2xl text-4xl leading-tight md:text-5xl">{localize(content.title, locale)}</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 opacity-75">{localize(content.body, locale)}</p>
            {content.highlights.length ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {content.highlights.map((highlight) => (
                  <li key={highlight.en} className="rounded-full border border-current/15 px-4 py-2 text-sm">
                    {localize(highlight, locale)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      );
    case "menu":
      return (
        <section id="menu" className="py-16">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-55">02 — Menu</p>
          <div className="mt-4 max-w-2xl">
            <h2 className="text-4xl md:text-5xl">{localize(content.title, locale)}</h2>
            <p className="mt-4 text-lg opacity-70">{localize(content.body, locale)}</p>
          </div>
          <MenuGrid items={menuItems} locale={locale} showPrices={content.showPrices} />
        </section>
      );
    case "hours":
      return (
        <section id="hours" className="py-16">
          <h2 className="text-4xl">{localize(content.title, locale)}</h2>
          <dl className="mt-7 max-w-2xl divide-y divide-current/10 border-y border-current/10">
            {content.entries.map((entry) => (
              <div key={entry.day.en} className="grid grid-cols-2 gap-4 py-3 text-sm">
                <dt>{localize(entry.day, locale)}</dt>
                <dd className="text-right opacity-70">{localize(entry.hours, locale)}</dd>
              </div>
            ))}
          </dl>
          {content.note ? <p className="mt-3 text-sm opacity-60">{localize(content.note, locale)}</p> : null}
        </section>
      );
    case "contact": {
      const website = safeExternalUrl(content.website);
      const instagram = safeExternalUrl(content.instagram, "instagram");
      const maps = safeExternalUrl(content.mapUrl, "maps");
      const booking = safeExternalUrl(content.booking?.url);
      return (
        <section id="contact" className="py-16">
          <div className="grid gap-10 rounded-[2rem] border border-current/10 bg-white/45 p-7 md:grid-cols-2 md:p-10">
            <div>
              <h2 className="text-4xl">{localize(content.title, locale)}</h2>
              <p className="mt-4 leading-7 opacity-70">{localize(content.body, locale)}</p>
            </div>
            <div className="space-y-3 text-sm">
              {booking ? <a className="block font-semibold underline" href={booking} rel="noreferrer" target="_blank">{bookingText} ↗</a> : null}
              {content.address ? <p>{localize(content.address, locale)}</p> : null}
              {content.phone ? <a className="block underline" href={`tel:${content.phone}`}>{content.phone}</a> : null}
              {content.email ? <a className="block underline" href={`mailto:${content.email}`}>{content.email}</a> : null}
              {website ? <a className="block underline" href={website} rel="noreferrer" target="_blank">Website ↗</a> : null}
              {instagram ? <a className="block underline" href={instagram} rel="noreferrer" target="_blank">Instagram ↗</a> : null}
              {maps ? <a className="block underline" href={maps} rel="noreferrer" target="_blank">{locale === "fr" ? "Voir sur Google Maps ↗" : "View on Google Maps ↗"}</a> : null}
            </div>
          </div>
        </section>
      );
    }
    default:
      return assertNever(content);
  }
}

export default async function ShopSitePage({ params }: ShopPageProps) {
  const { slug } = await params;
  const loaded = await loadSiteBySlug(slug);
  if (!loaded?.merchant.program || !loaded.merchant.sitePublished) {
    notFound();
  }

  const { merchant, siteData } = loaded;
  const program = merchant.program;
  if (!program) {
    notFound();
  }
  const locale = await getLocale();
  const media = parseStoredSiteMedia(merchant.siteMedia);
  const hero = siteData.sections.find(
    (section) => section.enabled && section.content.type === "hero",
  );
  const loyalty = siteData.sections.find(
    (section) => section.enabled && section.content.type === "loyalty",
  );
  const contact = siteData.sections.find(
    (section) => section.enabled && section.content.type === "contact",
  );
  const snapshotIsLive =
    merchant.placeSyncedAt &&
    merchant.placeSnapshot &&
    merchant.placeSyncedAt >= merchant.placeSnapshot.syncedAt;
  const place = normalizedPlaceSchema.safeParse(
    snapshotIsLive ? merchant.placeSnapshot?.payload : undefined,
  );
  const heroContent = hero?.content.type === "hero" ? hero.content : null;
  const loyaltyContent =
    loyalty?.content.type === "loyalty" ? loyalty.content : null;
  const booking = contact?.content.type === "contact" ? contact.content.booking : undefined;
  const bookingUrl = safeExternalUrl(booking?.url);
  const menuEnabled = siteData.sections.some(
    (section) => section.enabled && section.content.type === "menu",
  );
  const bookingText =
    (booking?.label ? localize(booking.label, locale).trim() : "") ||
    localize(bookingLabel(siteKindFamily(merchant.siteKind)), locale);

  const displayFont = fontCss(merchant.fontFamily);
  const t = (
    key: Parameters<typeof translate>[1],
    values?: Record<string, string | number>,
  ) => translate(locale, key, values);
  const style = {
    "--site-ink": merchant.primaryColor,
    "--site-paper": merchant.backgroundColor,
    "--site-accent": merchant.accentColor,
    background: `linear-gradient(155deg, ${merchant.backgroundColor}, ${merchant.gradientEnd})`,
    color: merchant.primaryColor,
    fontFamily: displayFont,
  } as CSSProperties;

  return (
    <div className="min-h-full overflow-hidden" style={style}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          {merchant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={merchant.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : <span className="h-3 w-3 rounded-full" style={{ background: merchant.accentColor }} />}
          <p className="text-lg font-semibold">{merchant.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {bookingUrl ? (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-current/25 px-4 py-2.5 text-sm font-semibold"
            >
              {bookingText}
            </a>
          ) : null}
          <a href="#loyalty" className="rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: merchant.primaryColor, color: merchant.backgroundColor }}>
            {t("getTheCard")}
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="grid min-h-[36rem] items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: merchant.accentColor }}>
              {heroContent ? localize(heroContent.eyebrow, locale) : merchant.neighborhood || merchant.siteKind}
            </p>
            <h1 className="mt-5 text-6xl leading-[0.92] tracking-[-0.04em] md:text-8xl">
              {heroContent ? localize(heroContent.title, locale) : merchant.tagline || merchant.name}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 opacity-75">
              {heroContent ? localize(heroContent.body, locale) : merchant.about || program.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#loyalty" className="rounded-full px-6 py-3 text-sm font-semibold" style={{ background: merchant.primaryColor, color: merchant.backgroundColor }}>{t("getTheCard")}</a>
              {bookingUrl ? (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-current/20 px-6 py-3 text-sm font-semibold"
                >
                  {bookingText} ↗
                </a>
              ) : null}
              {(heroContent?.secondaryAction?.href ?? "#menu") !== "#menu" || menuEnabled ? (
                <a href={heroContent?.secondaryAction?.href ?? "#menu"} className="rounded-full border border-current/20 px-6 py-3 text-sm font-semibold">
                  {heroContent?.secondaryAction
                    ? localize(heroContent.secondaryAction.label, locale)
                    : locale === "fr" ? "Découvrir" : "Explore"}
                </a>
              ) : null}
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm rotate-[1.5deg]">
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
          </div>
        </section>

        {place.success && place.data.rating ? (
          <section className="flex flex-wrap items-center justify-between gap-3 border-y border-current/10 py-5 text-sm">
            <p><strong className="text-xl">{place.data.rating.toFixed(1)} ★</strong> <span className="opacity-65">Google · {place.data.ratingCount} {locale === "fr" ? "avis" : "reviews"}</span></p>
            {place.data.mapsUrl ? <a className="underline" href={place.data.mapsUrl} target="_blank" rel="noreferrer">{locale === "fr" ? "Voir la fiche Google ↗" : "View Google listing ↗"}</a> : null}
          </section>
        ) : null}

        {siteData.sections
          .filter((section) => section.enabled)
          .map((section) => (
            <ContentSection
              key={section.key}
              section={section}
              locale={locale}
              menuItems={siteData.menuItems}
              bookingText={bookingText}
            />
          ))}

        <ImageGallery media={media} locale={locale} />

        <section id="loyalty" className="scroll-mt-8 rounded-[2.5rem] bg-white/70 p-6 backdrop-blur md:p-12">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: merchant.accentColor }}>Keeps loyalty</p>
              <h2 className="mt-3 text-4xl md:text-5xl">
                {loyaltyContent ? localize(loyaltyContent.title, locale) : t("yourStampCard")}
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-7 opacity-75">
                {loyaltyContent
                  ? localize(loyaltyContent.body, locale)
                  : t("publicJoinHelp", {
                      count: program.stampsRequired,
                      reward: program.rewardLabel.toLowerCase(),
                    })}
              </p>
              <div className="mt-6">
                <JoinForm slug={merchant.slug} shopName={merchant.name} />
              </div>
            </div>
            <div className="mx-auto w-full max-w-sm">
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
              <p className="mt-4 text-center text-sm opacity-60">{t("publicSaveHelp")}</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-current/10 px-5 py-8 text-center text-xs opacity-55">
        {merchant.name} · {locale === "fr" ? "Propulsé par Keeps" : "Powered by Keeps"}
      </footer>
    </div>
  );
}
