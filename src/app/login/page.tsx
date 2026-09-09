import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/LoginForm";
import { isResendConfigured } from "@/lib/config";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  const params = await searchParams;
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <h1 className="font-serif mt-8 text-4xl">{t("merchantSignIn")}</h1>
      <p className="mt-3 text-muted">{t("demoAccount")}</p>
      <div className="mt-8">
        <LoginForm callbackUrl={params.callbackUrl ?? "/dashboard"} magicLinkEnabled={isResendConfigured()} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        {t("newBusiness")}{" "}
        <Link href="/signup" className="text-ink underline">
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
