export type CardFontId =
  | "fraunces"
  | "playfair"
  | "cormorant"
  | "dm-sans"
  | "outfit"
  | "space-grotesk";

export type CardTemplate = {
  id: string;
  name: string;
  vibe: string;
  style: "minimal" | "classic" | "bold";
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  gradientEnd: string;
  fontFamily: CardFontId;
};

export const CARD_FONTS: { id: CardFontId; label: string; css: string }[] = [
  { id: "fraunces", label: "Fraunces", css: "var(--font-display), ui-serif, serif" },
  { id: "playfair", label: "Playfair", css: "var(--font-playfair), ui-serif, serif" },
  { id: "cormorant", label: "Cormorant", css: "var(--font-cormorant), ui-serif, serif" },
  { id: "dm-sans", label: "DM Sans", css: "var(--font-dm-sans), ui-sans-serif, sans-serif" },
  { id: "outfit", label: "Outfit", css: "var(--font-outfit), ui-sans-serif, sans-serif" },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    css: "var(--font-space-grotesk), ui-sans-serif, sans-serif",
  },
];

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "cream",
    name: "Cafe cream",
    vibe: "Warm paper",
    style: "minimal",
    primaryColor: "#1c1914",
    backgroundColor: "#f4efe6",
    accentColor: "#c45c26",
    gradientEnd: "#e4d3b8",
    fontFamily: "fraunces",
  },
  {
    id: "espresso",
    name: "Espresso",
    vibe: "Dark roast",
    style: "classic",
    primaryColor: "#f4efe6",
    backgroundColor: "#241c16",
    accentColor: "#d4a056",
    gradientEnd: "#3a2c22",
    fontFamily: "playfair",
  },
  {
    id: "bakery",
    name: "Bakery blush",
    vibe: "Pastry",
    style: "bold",
    primaryColor: "#4a2c32",
    backgroundColor: "#f8e8e4",
    accentColor: "#c45c6a",
    gradientEnd: "#f0d0c8",
    fontFamily: "cormorant",
  },
  {
    id: "salon",
    name: "Salon gold",
    vibe: "Quiet luxury",
    style: "classic",
    primaryColor: "#2c2418",
    backgroundColor: "#f3ead4",
    accentColor: "#b08948",
    gradientEnd: "#e6d5a8",
    fontFamily: "playfair",
  },
  {
    id: "juice",
    name: "Juice bar",
    vibe: "Fresh",
    style: "minimal",
    primaryColor: "#1f3d2b",
    backgroundColor: "#e8f3d8",
    accentColor: "#5a8f3a",
    gradientEnd: "#cfe8b0",
    fontFamily: "outfit",
  },
  {
    id: "night",
    name: "Night market",
    vibe: "Neon ink",
    style: "bold",
    primaryColor: "#f5f0ff",
    backgroundColor: "#16141f",
    accentColor: "#c45cff",
    gradientEnd: "#2a1838",
    fontFamily: "space-grotesk",
  },
  {
    id: "mono",
    name: "Mono",
    vibe: "Clean and modern",
    style: "minimal",
    primaryColor: "#151515",
    backgroundColor: "#f7f7f5",
    accentColor: "#151515",
    gradientEnd: "#e9e9e5",
    fontFamily: "dm-sans",
  },
  {
    id: "heritage",
    name: "Heritage",
    vibe: "Timeless green",
    style: "classic",
    primaryColor: "#f5ead7",
    backgroundColor: "#173d32",
    accentColor: "#d5a95f",
    gradientEnd: "#285949",
    fontFamily: "cormorant",
  },
  {
    id: "signal",
    name: "Signal",
    vibe: "Bright and confident",
    style: "bold",
    primaryColor: "#171126",
    backgroundColor: "#f0dcff",
    accentColor: "#ff5c35",
    gradientEnd: "#ffcde8",
    fontFamily: "outfit",
  },
];

export function fontCss(id: string): string {
  return CARD_FONTS.find((font) => font.id === id)?.css ?? CARD_FONTS[0].css;
}

export function isCardFont(value: string): value is CardFontId {
  return CARD_FONTS.some((font) => font.id === value);
}

function normalizeHex(hex: string): string | null {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex.slice(1);
  }
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return hex
      .slice(1)
      .split("")
      .map((value) => `${value}${value}`)
      .join("");
  }
  return null;
}

function luminance(hex: string): number {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return 0;
  }
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (
    channels[0] * 0.2126 +
    channels[1] * 0.7152 +
    channels[2] * 0.0722
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function accessibleTextColor(background: string): "#111111" | "#ffffff" {
  return contrastRatio("#111111", background) >=
    contrastRatio("#ffffff", background)
    ? "#111111"
    : "#ffffff";
}
