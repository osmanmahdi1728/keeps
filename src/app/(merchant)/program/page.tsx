import { CardDesigner } from "@/components/CardDesigner";
import { requireMerchant } from "@/lib/guards";
import {
  appleWalletReadiness,
  googleWalletReadiness,
} from "@/lib/config";
import { appUrl } from "@/lib/ids";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { customerEntryPath } from "@/lib/site";

export default async function ProgramPage() {
  const merchant = await requireMerchant();
  const program = merchant.program;
  if (!program) {
    return null;
  }
  const locale = await getLocale();
  const apple = appleWalletReadiness();
  const google = googleWalletReadiness();

  return (
    <div>
      <h1 className="font-serif text-4xl">{translate(locale, "cardDesign")}</h1>
      <p className="mt-2 max-w-xl text-muted">
        {translate(locale, "cardDesignHelp")}
      </p>
      <div className="mt-8">
        <CardDesigner
          name={merchant.name}
          rewardLabel={program.rewardLabel}
          stampsRequired={program.stampsRequired}
          description={program.description ?? ""}
          logoUrl={merchant.logoUrl ?? ""}
          primaryColor={merchant.primaryColor}
          backgroundColor={merchant.backgroundColor}
          accentColor={merchant.accentColor}
          gradientEnd={merchant.gradientEnd}
          fontFamily={merchant.fontFamily}
          templateId={merchant.templateId}
          slug={merchant.slug}
          joinUrl={`${appUrl()}${customerEntryPath(merchant.slug)}`}
          appleReady={apple.ready}
          googleReady={google.ready && google.publishing === "live"}
        />
      </div>
    </div>
  );
}
