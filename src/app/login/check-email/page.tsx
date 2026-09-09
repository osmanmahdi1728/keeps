import Link from "next/link";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function CheckEmailPage() {
  const locale = await getLocale();
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <h1 className="font-serif mt-8 text-4xl">{translate(locale, "checkEmail")}</h1>
      <p className="mt-3 text-muted">{translate(locale, "checkEmailHelp")}</p>
    </div>
  );
}
