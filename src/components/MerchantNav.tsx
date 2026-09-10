"use client";

import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { useI18n } from "@/components/I18nProvider";

export function MerchantNav({ shopName }: { shopName: string }) {
  const { t } = useI18n();
  const links = [
    { href: "/dashboard", label: t("overview") },
    { href: "/stamp", label: t("stamp") },
    { href: "/customers", label: t("customers") },
    { href: "/campaigns", label: t("campaigns") },
    { href: "/program", label: t("card") },
  ] as const;

  return (
    <header className="border-b border-line bg-card/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/dashboard" className="font-serif text-2xl tracking-tight">
          Keeps
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted sm:inline">{shopName}</span>
          <form action={logoutAction}>
            <button type="submit" className="text-muted underline-offset-4 hover:underline">
              {t("signOut")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
