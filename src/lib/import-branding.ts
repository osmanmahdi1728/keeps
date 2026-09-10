import { z } from "zod";

export const importedBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  gradientEnd: z.string().regex(/^#[0-9a-f]{6}$/i),
  fontFamily: z.enum([
    "fraunces",
    "source-sans",
    "playfair",
    "cormorant",
    "dm-sans",
    "outfit",
    "space-grotesk",
  ]),
});

export type ImportedBranding = z.infer<typeof importedBrandingSchema>;

type PalettePreset = ImportedBranding & { kinds: string[] };

// Matched as substrings, so entries cover both our site kinds and raw listing
// categories an importer may hand over. Most specific groups come first.
const PRESETS: PalettePreset[] = [
  {
    kinds: ["nails", "nail", "lashbrow", "lash", "brow", "wax", "esthetic"],
    primaryColor: "#241d21",
    backgroundColor: "#faf2f3",
    accentColor: "#a8546b",
    gradientEnd: "#e8ccd4",
    fontFamily: "cormorant",
  },
  {
    kinds: ["barber", "barbier"],
    primaryColor: "#191b1d",
    backgroundColor: "#f2f1ee",
    accentColor: "#7c5a3a",
    gradientEnd: "#d3cec4",
    fontFamily: "space-grotesk",
  },
  {
    kinds: ["bubbletea", "boba", "dessert", "ice_cream", "gelato", "candy"],
    primaryColor: "#221c26",
    backgroundColor: "#f7f2fa",
    accentColor: "#7d5aa6",
    gradientEnd: "#dcd0ec",
    fontFamily: "outfit",
  },
  {
    kinds: ["juice", "smoothie", "acai"],
    primaryColor: "#1a2119",
    backgroundColor: "#f2f7ee",
    accentColor: "#4f7a35",
    gradientEnd: "#cfe2c1",
    fontFamily: "dm-sans",
  },
  {
    kinds: ["cafe", "bakery", "restaurant", "food"],
    primaryColor: "#211a16",
    backgroundColor: "#f6efe5",
    accentColor: "#b6532a",
    gradientEnd: "#dec5a8",
    fontFamily: "fraunces",
  },
  {
    kinds: ["salon", "spa", "beauty", "wellness", "hair"],
    primaryColor: "#24201f",
    backgroundColor: "#f7f1ee",
    accentColor: "#9b625e",
    gradientEnd: "#dfc9c4",
    fontFamily: "cormorant",
  },
  {
    kinds: ["retail", "store", "shop", "clothing"],
    primaryColor: "#15191c",
    backgroundColor: "#f5f5f2",
    accentColor: "#315d65",
    gradientEnd: "#cbd9d6",
    fontFamily: "space-grotesk",
  },
  {
    kinds: [],
    primaryColor: "#1c1914",
    backgroundColor: "#f4efe6",
    accentColor: "#c45c26",
    gradientEnd: "#e4d3b8",
    fontFamily: "outfit",
  },
];

function mixWithWhite(hex: string, ratio: number): string {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels
    .map((channel) => Math.round(channel + (255 - channel) * ratio).toString(16).padStart(2, "0"))
    .join("")}`;
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function suggestImportedBranding(
  businessType: string,
  themeColor?: string,
): ImportedBranding {
  const normalizedType = businessType.toLowerCase();
  const preset =
    PRESETS.find((candidate) =>
      candidate.kinds.some((kind) => normalizedType.includes(kind)),
    ) ?? PRESETS[PRESETS.length - 1];

  const normalizedTheme = themeColor?.match(/^#[0-9a-f]{6}$/i)?.[0].toLowerCase();
  if (!normalizedTheme) {
    return {
      primaryColor: preset.primaryColor,
      backgroundColor: preset.backgroundColor,
      accentColor: preset.accentColor,
      gradientEnd: preset.gradientEnd,
      fontFamily: preset.fontFamily,
    };
  }

  const themeIsDark = relativeLuminance(normalizedTheme) < 0.35;
  return {
    ...preset,
    primaryColor: themeIsDark ? normalizedTheme : preset.primaryColor,
    accentColor: themeIsDark ? preset.accentColor : normalizedTheme,
    gradientEnd: mixWithWhite(normalizedTheme, 0.72),
  };
}
