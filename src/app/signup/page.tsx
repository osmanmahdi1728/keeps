import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "@/components/SignupForm";
import { getLocale, translate } from "@/lib/i18n";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-12">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <p className="mt-8 text-xs font-semibold tracking-[0.2em] uppercase text-stamp">
        {t("signupEyebrow")}
      </p>
      <h1 className="font-serif mt-2 text-4xl">{t("createShop")}</h1>
      <p className="mt-3 text-muted">
        {t("signupBody")}
      </p>
      <div className="mt-8 rounded-2xl border border-line bg-card p-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        {t("existingAccount")}{" "}
        <Link href="/login" className="text-ink underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
