import { unsubscribeByToken } from "@/app/actions/campaigns";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await unsubscribeByToken(token);
  const locale = await getLocale();

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-serif text-4xl">{translate(locale, "unsubscribedTitle")}</h1>
      <p className="mt-3 text-muted">{translate(locale, "unsubscribedBody")}</p>
    </div>
  );
}
