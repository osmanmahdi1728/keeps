import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Outfit,
  Playfair_Display,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";
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

export const metadata: Metadata = {
  title: "Keeps — Wallet stamp cards for local shops",
  description:
    "Issue digital stamp cards into Apple Wallet and Google Wallet. No customer app. Push and email when it is quiet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cardFonts} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
