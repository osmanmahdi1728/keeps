import { StampDesk } from "@/components/StampDesk";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function StampPage() {
  const locale = await getLocale();
  return (
    <div>
      <h1 className="font-serif text-4xl">{translate(locale, "stampPad")}</h1>
      <p className="mt-2 max-w-xl text-muted">
        {translate(locale, "stampPadHelp")}
      </p>
      <div className="mt-8">
        <StampDesk />
      </div>
    </div>
  );
}
