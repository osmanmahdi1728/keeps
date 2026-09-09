import { cookies } from "next/headers";
import { localeCookieName, parseLocale, type Locale } from "@/lib/i18n";

// Kept apart from the dictionaries so client components can import translate().
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return parseLocale(cookieStore.get(localeCookieName)?.value);
}
