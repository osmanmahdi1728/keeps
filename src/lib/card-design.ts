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
    primaryColor: "#f5f0ff",
    backgroundColor: "#16141f",
    accentColor: "#c45cff",
    gradientEnd: "#2a1838",
    fontFamily: "space-grotesk",
  },
];

export function fontCss(id: string): string {
  return CARD_FONTS.find((font) => font.id === id)?.css ?? CARD_FONTS[0].css;
}

export function isCardFont(value: string): value is CardFontId {
  return CARD_FONTS.some((font) => font.id === value);
}
