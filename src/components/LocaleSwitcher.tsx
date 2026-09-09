"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { setLocaleAction } from "@/app/actions/locale";
import { useI18n } from "@/components/I18nProvider";

export function LocaleSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const query = searchParams.toString();
  const returnTo = query ? `${pathname}?${query}` : pathname;

  return (
    <form
      action={setLocaleAction}
      aria-label={t("language")}
      className="fixed right-3 bottom-3 z-50 flex rounded-full border border-line bg-card p-1 text-xs font-semibold shadow-lg"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {(["en", "fr"] as const).map((option) => (
        <button
          key={option}
          type="submit"
          name="locale"
          value={option}
          aria-pressed={locale === option}
          className={`rounded-full px-3 py-2 ${
            locale === option ? "bg-ink text-paper" : "text-muted"
          }`}
        >
          {option === "en" ? t("english") : t("french")}
        </button>
      ))}
    </form>
  );
}
