import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <h1 className="font-serif mt-8 text-4xl">
        {sent ? t("resetEmailSent") : t("forgotPasswordTitle")}
      </h1>
      <p className="mt-3 text-muted">
        {sent ? t("resetEmailSentHelp") : t("forgotPasswordHelp")}
      </p>
      {sent ? null : (
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="text-ink underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
