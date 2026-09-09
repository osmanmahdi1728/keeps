import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { isResetTokenShape } from "@/lib/password-reset";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const params = await searchParams;
  const token = params.token ?? "";
  const validShape = isResetTokenShape(token);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <h1 className="font-serif mt-8 text-4xl">{t("resetPasswordTitle")}</h1>
      <p className="mt-3 text-muted">
        {validShape ? t("resetPasswordHelp") : t("resetTokenInvalid")}
      </p>
      {validShape ? (
        <div className="mt-8">
          <ResetPasswordForm token={token} />
        </div>
      ) : null}
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login/forgot" className="text-ink underline">
          {t("forgotPassword")}
        </Link>
      </p>
    </div>
  );
}
