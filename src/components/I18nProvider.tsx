"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  translate,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return value;
}
