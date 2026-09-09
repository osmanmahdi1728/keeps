"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  localeCookieName,
  parseLocale,
} from "@/lib/i18n";

export async function setLocaleAction(formData: FormData): Promise<never> {
  const locale = parseLocale(String(formData.get("locale") ?? ""));
  const requestedPath = String(formData.get("returnTo") ?? "/");
  const returnTo =
    requestedPath.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/";

  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(returnTo);
}
