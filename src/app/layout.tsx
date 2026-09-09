import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Outfit,
  Playfair_Display,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getLocale, translate } from "@/lib/i18n";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["500", "600"],
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const cardFonts = [display, body, playfair, cormorant, dmSans, outfit, spaceGrotesk]
  .map((font) => font.variable)
  .join(" ");

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: translate(locale, "metadataTitle"),
    description: translate(locale, "metadataDescription"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${cardFonts} h-full`}>
      <body className="min-h-full antialiased">
        <I18nProvider locale={locale}>
          {children}
          <Suspense>
            <LocaleSwitcher />
          </Suspense>
        </I18nProvider>
      </body>
    </html>
  );
}
