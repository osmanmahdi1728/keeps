"use client";

import { useActionState } from "react";
import { joinProgram } from "@/app/actions/join";
import { useI18n } from "@/components/I18nProvider";

export function JoinForm({ slug, shopName }: { slug: string; shopName: string }) {
  const { locale, t } = useI18n();
  const [state, action] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => joinProgram(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />
      <label className="block text-sm font-semibold">
        {t("name")}
        <input className="field mt-1" name="name" required maxLength={80} />
      </label>
      <label className="block text-sm font-semibold">
        {t("email")}
        <input className="field mt-1" type="email" name="email" required />
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketingOptIn" className="mt-1" />
        <span>
          <strong className="text-ink">{t("marketingOfferStrong")}</strong>{" "}
          {t("marketingOffer", { shop: shopName })}
        </span>
      </label>
      {state?.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
      <button className="btn btn-primary w-full" type="submit">
        {t("getCard")}
      </button>
    </form>
  );
}
