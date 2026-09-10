import { WebsiteEditor } from "@/components/WebsiteEditor";
import { requireMerchant } from "@/lib/guards";
import { appUrl } from "@/lib/ids";
import { customerEntryPath } from "@/lib/site";
import { isSiteAiConfigured } from "@/lib/site-ai";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { assembleSiteData, parseStoredSiteMedia } from "@/lib/site-migrate";
import {
  type LocalizedText,
  type SiteSection,
} from "@/lib/site-sections";
import { assertNever } from "@/lib/types";

function getEditorAnswers(
  sections: SiteSection[],
  legacy: {
    neighborhood: string;
    hours: string;
    knownFor: string;
  },
): {
  neighborhood: LocalizedText;
  hours: LocalizedText;
  knownFor: LocalizedText;
} {
  const answers = {
    neighborhood: {
      en: legacy.neighborhood,
      fr: legacy.neighborhood,
    },
    hours: { en: legacy.hours, fr: legacy.hours },
    knownFor: { en: legacy.knownFor, fr: legacy.knownFor },
  };

  for (const section of sections) {
    const content = section.content;
    switch (content.type) {
      case "hero":
        answers.neighborhood = content.eyebrow;
        if (!answers.knownFor.en || !answers.knownFor.fr) {
          answers.knownFor = content.body;
        }
        break;
      case "hours":
        if (content.entries[0]) {
          answers.hours = content.entries[0].hours;
        }
        break;
      case "about":
      case "menu":
      case "contact":
      case "loyalty":
        break;
      default:
        assertNever(content);
    }
  }
  return answers;
}

export default async function WebsitePage() {
  const merchant = await requireMerchant();
  const siteUrl = `${appUrl()}${customerEntryPath(merchant.slug, merchant.sitePublished)}`;
  const locale = await getLocale();
  const siteData = assembleSiteData({
    merchant,
    sections: merchant.siteSections,
    menuItems: merchant.siteMenuItems,
  });
  const answers = getEditorAnswers(siteData.sections, merchant);
  const media = parseStoredSiteMedia(merchant.siteMedia, {
    includePending: true,
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-stamp">{translate(locale, "websiteEyebrow")}</p>
        <h1 className="font-serif mt-2 text-4xl">{translate(locale, "websiteTitle")}</h1>
        <p className="mt-3 max-w-xl text-muted">
          {translate(locale, "websiteHelp")}
        </p>
        </div>
        <aside className="max-w-sm rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold">{translate(locale, "customerLink")}</p>
          <p className="mt-1 break-all font-mono text-[11px]">{siteUrl}</p>
          <p className="mt-2 text-xs text-muted">
            {translate(locale, "editorCustomerLinkHelp")}
          </p>
        </aside>
      </div>
      <div className="mt-8">
        <WebsiteEditor
          merchantName={merchant.name}
          slug={merchant.slug}
          siteTemplate={merchant.siteTemplate}
          siteKind={merchant.siteKind}
          sitePublished={merchant.sitePublished}
          aiReady={isSiteAiConfigured()}
          blobReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
          answers={answers}
          sections={siteData.sections}
          menuItems={siteData.menuItems}
          media={media}
          branding={{
            logoUrl: merchant.logoUrl,
            primaryColor: merchant.primaryColor,
            backgroundColor: merchant.backgroundColor,
            accentColor: merchant.accentColor,
            gradientEnd: merchant.gradientEnd,
            fontFamily: merchant.fontFamily,
          }}
        />
      </div>
    </div>
  );
}
