import { CardDesigner } from "@/components/CardDesigner";
import { requireMerchant } from "@/lib/guards";

export default async function ProgramPage() {
  const merchant = await requireMerchant();
  const program = merchant.program;
  if (!program) {
    return null;
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Card design</h1>
      <p className="mt-2 max-w-xl text-muted">
        Pick a template, drop in a logo to steal the color grade, then choose type. Customers see this on their phone.
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
