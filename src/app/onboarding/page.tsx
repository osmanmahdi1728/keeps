import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentMerchant } from "@/lib/merchant";
import { OnboardingForm } from "@/components/OnboardingForm";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const merchant = await getCurrentMerchant();
  if (merchant) {
    redirect("/dashboard");
  }
  const locale = await getLocale();

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <h1 className="font-serif mt-8 text-4xl">{translate(locale, "firstCard")}</h1>
      <p className="mt-3 text-muted">{translate(locale, "onboardingHelp")}</p>
      <div className="mt-8">
        <OnboardingForm />
      </div>
    </div>
  );
}
