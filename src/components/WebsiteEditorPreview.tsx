"use client";

import { useI18n } from "@/components/I18nProvider";
import { fontCss } from "@/lib/card-design";
import { bookingLabel, siteKindFamily } from "@/lib/site-kinds";
import {
  type SiteMenuItem,
  type SiteMedia,
  type SiteSection,
  type SiteSectionContent,
} from "@/lib/site-sections";
import { assertNever } from "@/lib/types";

function PreviewSection({
  content,
  locale,
  menuItems,
  bookingText,
}: {
  content: SiteSectionContent;
  locale: "en" | "fr";
  menuItems: SiteMenuItem[];
  bookingText: string;
}) {
  switch (content.type) {
    case "hero":
      return (
        <section className="px-6 py-14 text-center">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase opacity-70">
            {content.eyebrow[locale]}
          </p>
          <h2 className="mx-auto mt-3 max-w-xl text-4xl leading-none">
            {content.title[locale]}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 opacity-75">
            {content.body[locale]}
          </p>
          {content.secondaryAction ? (
            <span className="mt-5 inline-block rounded-full border border-current/25 px-4 py-1.5 text-xs font-semibold">
              {content.secondaryAction.label[locale]}
            </span>
          ) : null}
        </section>
      );
    case "about":
      return (
        <section className="border-t border-current/15 px-6 py-10">
          <h3 className="text-2xl">{content.title[locale]}</h3>
          <p className="mt-3 text-sm leading-6 opacity-75">
            {content.body[locale]}
          </p>
        </section>
      );
    case "menu":
      return (
        <section className="border-t border-current/15 px-6 py-10">
          <h3 className="text-2xl">{content.title[locale]}</h3>
          <p className="mt-2 text-sm opacity-70">{content.body[locale]}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {menuItems
              .filter((item) => item.available)
              .map((item) => (
                <div key={item.key} className="border-b border-current/20 pb-3">
                  <div className="flex justify-between gap-3 font-semibold">
                    <span>{item.name[locale]}</span>
                    {content.showPrices && item.priceCents !== null ? (
                      <span>${(item.priceCents / 100).toFixed(2)}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs opacity-65">
                    {item.description?.[locale]}
                  </p>
                </div>
              ))}
          </div>
        </section>
      );
    case "hours":
      return (
        <section className="border-t border-current/15 px-6 py-10">
          <h3 className="text-2xl">{content.title[locale]}</h3>
          {content.entries.map((entry, index) => (
            <p
              className="mt-3 flex justify-between gap-4 text-sm"
              key={`${entry.day.en}-${index}`}
            >
              <span>{entry.day[locale]}</span>
              <span>{entry.hours[locale]}</span>
            </p>
          ))}
        </section>
      );
    case "contact":
      return (
        <section className="border-t border-current/15 px-6 py-10">
          <h3 className="text-2xl">{content.title[locale]}</h3>
          <p className="mt-3 text-sm opacity-75">{content.body[locale]}</p>
          {content.booking ? (
            <span className="mt-4 inline-block rounded-full border border-current/25 px-4 py-1.5 text-xs font-semibold">
              {content.booking.label?.[locale]?.trim() || bookingText} ↗
            </span>
          ) : null}
          <p className="mt-3 text-xs opacity-65">
            {[content.address?.[locale], content.phone, content.email]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </section>
      );
    case "loyalty":
      return (
        <section className="border-t border-current/15 px-6 py-10 text-center">
          <h3 className="text-2xl">{content.title[locale]}</h3>
          <p className="mx-auto mt-3 max-w-md text-sm opacity-75">
            {content.body[locale]}
          </p>
          <span className="mt-5 inline-block rounded-full bg-current px-5 py-2 text-xs">
            <span className="text-white">{content.action.label[locale]}</span>
          </span>
        </section>
      );
    default:
      return assertNever(content);
  }
}

export function WebsiteEditorPreview({
  branding,
  device,
  locale,
  menuItems,
  media,
  merchantName,
  sections,
  siteKind,
  onDeviceChange,
  onLocaleChange,
}: {
  branding: {
    logoUrl: string | null;
    primaryColor: string;
    backgroundColor: string;
    accentColor: string;
    gradientEnd: string;
    fontFamily: string;
  };
  device: "desktop" | "mobile";
  locale: "en" | "fr";
  menuItems: SiteMenuItem[];
  media: SiteMedia[];
  merchantName: string;
  sections: SiteSection[];
  siteKind: string;
  onDeviceChange: (device: "desktop" | "mobile") => void;
  onLocaleChange: (locale: "en" | "fr") => void;
}) {
  const { t } = useI18n();
  const bookingText = bookingLabel(siteKindFamily(siteKind))[locale];
  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full border border-line bg-card p-1">
          {(["desktop", "mobile"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onDeviceChange(option)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                device === option ? "bg-ink text-paper" : ""
              }`}
            >
              {option === "desktop" ? t("editorDesktop") : t("editorMobile")}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["en", "fr"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onLocaleChange(option)}
              className={`rounded-full px-2 py-1 text-xs font-bold ${
                locale === option ? "bg-stamp text-white" : ""
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`mx-auto overflow-hidden rounded-[2rem] border-8 border-ink/90 shadow-xl transition-[max-width] ${
          device === "mobile" ? "max-w-[23rem]" : "max-w-3xl"
        }`}
        style={{
          background: `linear-gradient(150deg, ${branding.backgroundColor}, ${branding.gradientEnd})`,
          color: branding.primaryColor,
          fontFamily: fontCss(branding.fontFamily),
        }}
      >
        <header className="flex items-center justify-between border-b border-current/15 px-5 py-4">
          <div className="flex items-center gap-2">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span
                className="h-8 w-8 rounded-full"
                style={{ background: branding.accentColor }}
              />
            )}
            <strong className="text-sm">{merchantName}</strong>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase">
            {t("editorPreview")}
          </span>
        </header>
        {sections
          .filter((section) => section.enabled)
          .map((section) => (
            <PreviewSection
              key={section.key}
              content={section.content}
              locale={locale}
              menuItems={menuItems}
              bookingText={bookingText}
            />
          ))}
        {media.some((item) => item.kind === "image") ? (
          <div className="grid grid-cols-3 gap-1 border-t border-current/15 p-2">
            {media
              .filter(
                (item): item is Extract<SiteMedia, { kind: "image" }> =>
                  item.kind === "image",
              )
              .slice(0, 3)
              .map((item) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={item.key}
                  src={item.url}
                  alt={item.alt[locale]}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
