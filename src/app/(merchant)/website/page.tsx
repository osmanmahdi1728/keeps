import { WebsiteEditor } from "@/components/WebsiteEditor";
import { requireMerchant } from "@/lib/guards";
import { appUrl } from "@/lib/ids";
import { isSiteAiConfigured } from "@/lib/site-ai";
import { getLocale, translate } from "@/lib/i18n";

export default async function WebsitePage() {
  const merchant = await requireMerchant();
  const siteUrl = `${appUrl()}/s/${merchant.slug}`;
  const locale = await getLocale();

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-stamp">{translate(locale, "websiteEyebrow")}</p>
        <h1 className="font-serif mt-2 text-4xl">{translate(locale, "websiteTitle")}</h1>
        <p className="mt-3 max-w-xl text-muted">
          {translate(locale, "websiteHelp")}
        </p>
        <div className="mt-8">
          <WebsiteEditor
            slug={merchant.slug}
            siteTemplate={merchant.siteTemplate}
            siteKind={merchant.siteKind}
            neighborhood={merchant.neighborhood}
            hours={merchant.hours}
            knownFor={merchant.knownFor}
            instagram={merchant.instagram}
            tagline={merchant.tagline}
            about={merchant.about}
            sitePublished={merchant.sitePublished}
            aiReady={isSiteAiConfigured()}
          />
        </div>
      </div>
      <aside className="rounded-2xl border border-line bg-card p-5">
        <p className="text-sm font-semibold">{translate(locale, "customerLink")}</p>
        <p className="mt-2 break-all font-mono text-xs">{siteUrl}</p>
        <p className="mt-4 text-sm text-muted">
          Put this on Google, Instagram, and the counter QR. Join lives on the same page.
        </p>
      </aside>
    </div>
  );
}
