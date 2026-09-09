import { CardDesigner } from "@/components/CardDesigner";
import { requireMerchant } from "@/lib/guards";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function ProgramPage() {
  const merchant = await requireMerchant();
  const program = merchant.program;
  if (!program) {
    return null;
  }
  const locale = await getLocale();

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
        />
      </div>
    </div>
  );
}
