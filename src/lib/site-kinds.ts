import {
  siteSectionsSchema,
  type LocalizedText,
  type SiteSection,
} from "@/lib/site-sections";
import { assertNever } from "@/lib/types";

export type SiteKindId =
  | "cafe"
  | "bakery"
  | "juice"
  | "bubbletea"
  | "dessert"
  | "salon"
  | "barber"
  | "nails"
  | "lashbrow";

/**
 * `crave` shops are walk-in and high frequency: the card rides on a small basket.
 * `selfcare` shops are appointment-led: the card rides on a visit worth many baskets,
 * so their pages lead with services, prices, and a booking link.
 */
export type SiteKindFamily = "crave" | "selfcare";

type SiteKindProfile = {
  id: SiteKindId;
  family: SiteKindFamily;
  /**
   * Matched as substrings against an imported listing type or scraped page text.
   * The longest matching hint wins, so `nail_salon` resolves to nails rather than salon.
   */
  typeHints: string[];
  reward: { label: string; stampsRequired: number };
  knownFor: LocalizedText;
  menuTitle: LocalizedText;
  menuBody: LocalizedText;
  loyaltyTitle: LocalizedText;
};

export const SITE_KIND_PROFILES: SiteKindProfile[] = [
  {
    id: "cafe",
    family: "crave",
    typeHints: ["coffee", "cafe", "espresso", "café"],
    reward: { label: "Free drink", stampsRequired: 10 },
    knownFor: {
      en: "Espresso pulled to order and a counter that learns your name.",
      fr: "Un espresso préparé à la commande et un comptoir qui retient votre nom.",
    },
    menuTitle: { en: "Menu highlights", fr: "Les incontournables" },
    menuBody: {
      en: "A short list, made well.",
      fr: "Une carte courte, bien exécutée.",
    },
    loyaltyTitle: {
      en: "Regulars drink better",
      fr: "Les habitués sont mieux servis",
    },
  },
  {
    id: "bakery",
    family: "crave",
    typeHints: ["bakery", "boulangerie", "patisserie", "bagel", "donut", "bread"],
    reward: { label: "Free pastry", stampsRequired: 8 },
    knownFor: {
      en: "Baked before sunrise, usually gone by afternoon.",
      fr: "Cuit avant l’aube, souvent épuisé en après-midi.",
    },
    menuTitle: { en: "From the oven", fr: "Sortis du four" },
    menuBody: {
      en: "Baked fresh every morning.",
      fr: "Cuit frais chaque matin.",
    },
    loyaltyTitle: {
      en: "Your mornings, rewarded",
      fr: "Vos matins récompensés",
    },
  },
  {
    id: "juice",
    family: "crave",
    typeHints: ["juice", "smoothie", "acai", "açaí", "jus"],
    reward: { label: "Free drink", stampsRequired: 8 },
    knownFor: {
      en: "Cold-pressed daily, nothing from concentrate.",
      fr: "Pressé à froid chaque jour, jamais de concentré.",
    },
    menuTitle: { en: "The blends", fr: "Les mélanges" },
    menuBody: {
      en: "Fruit, greens, and no shortcuts.",
      fr: "Fruits, verdures, aucun raccourci.",
    },
    loyaltyTitle: { en: "Drink well, come back", fr: "Buvez bien, revenez" },
  },
  {
    id: "bubbletea",
    family: "crave",
    typeHints: ["bubble_tea", "bubble tea", "boba", "tea_house", "tea", "thé"],
    reward: { label: "Free drink", stampsRequired: 8 },
    knownFor: {
      en: "Tea brewed in small batches, pearls cooked through the day.",
      fr: "Thé infusé en petites quantités, perles cuites tout au long de la journée.",
    },
    menuTitle: {
      en: "Milk teas and fruit teas",
      fr: "Thés au lait et thés fruités",
    },
    menuBody: {
      en: "Pick your sweetness and your ice.",
      fr: "Choisissez votre niveau de sucre et de glace.",
    },
    loyaltyTitle: {
      en: "Your usual, on the house",
      fr: "Votre habituel, offert",
    },
  },
  {
    id: "dessert",
    family: "crave",
    typeHints: [
      "ice_cream",
      "ice cream",
      "gelato",
      "dessert",
      "crème glacée",
      "candy",
      "chocolate",
      "chocolaterie",
    ],
    reward: { label: "Free scoop", stampsRequired: 8 },
    knownFor: {
      en: "Made in-house, in small batches, all week.",
      fr: "Fait maison, en petites quantités, toute la semaine.",
    },
    menuTitle: { en: "Today’s flavours", fr: "Les saveurs du jour" },
    menuBody: {
      en: "Rotating, seasonal, and never too sweet.",
      fr: "En rotation, de saison, jamais trop sucré.",
    },
    loyaltyTitle: {
      en: "Sweet on regulars",
      fr: "Un faible pour les habitués",
    },
  },
  {
    id: "salon",
    family: "selfcare",
    typeHints: ["hair_salon", "hair", "hairdresser", "coiffure", "salon"],
    reward: { label: "15% off a service", stampsRequired: 6 },
    knownFor: {
      en: "Cuts and colour, with an honest consultation first.",
      fr: "Coupe et couleur, avec une vraie consultation d’abord.",
    },
    menuTitle: { en: "Services and prices", fr: "Services et tarifs" },
    menuBody: {
      en: "Book what you need and know the price first.",
      fr: "Réservez ce qu’il vous faut, le prix est clair d’avance.",
    },
    loyaltyTitle: { en: "Your chair, rewarded", fr: "Votre fauteuil récompensé" },
  },
  {
    id: "barber",
    family: "selfcare",
    typeHints: ["barber", "barbier"],
    reward: { label: "$10 off a cut", stampsRequired: 8 },
    knownFor: {
      en: "A clean line, a straight-razor finish, and no rush.",
      fr: "Une ligne nette, une finition au rasoir, sans presse.",
    },
    menuTitle: { en: "Cuts and prices", fr: "Coupes et tarifs" },
    menuBody: {
      en: "Walk in, or book the chair ahead.",
      fr: "Sans rendez-vous ou en réservant le fauteuil.",
    },
    loyaltyTitle: { en: "The regular chair", fr: "Le fauteuil des habitués" },
  },
  {
    id: "nails",
    family: "selfcare",
    typeHints: ["nail_salon", "nail", "manicure", "pedicure", "ongles", "manucure"],
    reward: { label: "$15 off a full set", stampsRequired: 6 },
    knownFor: {
      en: "Gel, structured manicures, and tools sterilised between clients.",
      fr: "Gel, manucures structurées et outils stérilisés entre chaque client.",
    },
    menuTitle: { en: "Services and prices", fr: "Services et tarifs" },
    menuBody: {
      en: "Sets, fills, and removals, priced clearly.",
      fr: "Poses, remplissages et retraits, à prix clairs.",
    },
    loyaltyTitle: {
      en: "Your fills add up",
      fr: "Vos rendez-vous s’accumulent",
    },
  },
  {
    id: "lashbrow",
    family: "selfcare",
    typeHints: [
      "eyelash",
      "lash",
      "brow",
      "eyebrow",
      "threading",
      "waxing",
      "beauty_salon",
      "esthetic",
      "esthétique",
      "spa",
      "cils",
      "sourcils",
    ],
    reward: { label: "Free fill", stampsRequired: 6 },
    knownFor: {
      en: "Lash and brow work shaped to your face, not to a trend.",
      fr: "Cils et sourcils adaptés à votre visage, pas à une tendance.",
    },
    menuTitle: { en: "Services and prices", fr: "Services et tarifs" },
    menuBody: {
      en: "Sets, fills, and tints, priced clearly.",
      fr: "Poses, remplissages et teintures, à prix clairs.",
    },
    loyaltyTitle: {
      en: "Every fill counts",
      fr: "Chaque retouche compte",
    },
  },
];

const FALLBACK_PROFILE = SITE_KIND_PROFILES[0];

export function siteKindProfile(value: string | undefined): SiteKindProfile {
  return (
    SITE_KIND_PROFILES.find((profile) => profile.id === value) ??
    FALLBACK_PROFILE
  );
}

export function siteKindFamily(value: string | undefined): SiteKindFamily {
  return siteKindProfile(value).family;
}

/** Longest hint wins, so specific listing types beat the generic ones they contain. */
export function inferSiteKind(value: string): SiteKindId {
  const haystack = value.toLowerCase();
  let best: { id: SiteKindId; length: number } | null = null;

  for (const profile of SITE_KIND_PROFILES) {
    for (const hint of profile.typeHints) {
      if (haystack.includes(hint) && (!best || hint.length > best.length)) {
        best = { id: profile.id, length: hint.length };
      }
    }
  }

  return best?.id ?? FALLBACK_PROFILE.id;
}

export function suggestProgram(kind: string): {
  rewardLabel: string;
  stampsRequired: number;
} {
  const { reward } = siteKindProfile(kind);
  return {
    rewardLabel: reward.label,
    stampsRequired: reward.stampsRequired,
  };
}

function exploreLabel(family: SiteKindFamily): LocalizedText {
  switch (family) {
    case "crave":
      return { en: "See the menu", fr: "Voir le menu" };
    case "selfcare":
      return { en: "See services", fr: "Voir les services" };
    default:
      return assertNever(family);
  }
}

export function bookingLabel(family: SiteKindFamily): LocalizedText {
  switch (family) {
    case "crave":
      return { en: "Order online", fr: "Commander en ligne" };
    case "selfcare":
      return { en: "Book", fr: "Réserver" };
    default:
      return assertNever(family);
  }
}

function loyaltyBody(
  family: SiteKindFamily,
  stampsRequired: number,
  rewardLabel: string,
): LocalizedText {
  const reward = rewardLabel.toLowerCase();
  switch (family) {
    case "crave":
      return {
        en: `Collect ${stampsRequired} stamps and the next one is ${reward}.`,
        fr: `Cumulez ${stampsRequired} étampes et la prochaine visite donne ${reward}.`,
      };
    case "selfcare":
      return {
        en: `Every ${stampsRequired} visits earns ${reward}.`,
        fr: `Chaque ${stampsRequired} visites donnent ${reward}.`,
      };
    default:
      return assertNever(family);
  }
}

export type DefaultSiteSectionsInput = {
  merchantName: string;
  siteKind?: string;
  neighborhood?: string;
  knownFor?: string;
  hours?: string;
  rewardLabel?: string;
  stampsRequired?: number;
  instagram?: string;
};

export function createDefaultSiteSections(
  input: DefaultSiteSectionsInput,
): SiteSection[] {
  const profile = siteKindProfile(input.siteKind);
  const neighborhood = input.neighborhood?.trim() || "Your neighborhood";
  const hours = input.hours?.trim() || "Open daily";
  const rewardLabel = input.rewardLabel?.trim() || "a reward";
  const stampsRequired = input.stampsRequired ?? profile.reward.stampsRequired;
  const instagram = input.instagram?.trim() || undefined;
  // A merchant-supplied summary only ever arrives in one language, so the other slot
  // keeps the trade's default rather than echoing untranslated copy.
  const knownFor = input.knownFor?.trim()
    ? { en: input.knownFor.trim(), fr: profile.knownFor.fr }
    : profile.knownFor;

  return siteSectionsSchema.parse([
    {
      key: "hero",
      position: 0,
      content: {
        type: "hero",
        eyebrow: { en: neighborhood, fr: neighborhood },
        title: {
          en: `Welcome to ${input.merchantName}`,
          fr: `Bienvenue chez ${input.merchantName}`,
        },
        body: knownFor,
        primaryAction: {
          label: { en: "Get the loyalty card", fr: "Obtenir la carte fidélité" },
          href: "#loyalty",
        },
        secondaryAction: {
          label: exploreLabel(profile.family),
          href: "#menu",
        },
      },
    },
    {
      key: "about",
      position: 10,
      content: {
        type: "about",
        title: { en: "Made for the neighborhood", fr: "Pensé pour le quartier" },
        body: {
          en: `${input.merchantName} is a place to slow down, enjoy something good, and feel at home.`,
          fr: `${input.merchantName}, c’est un endroit où ralentir, savourer et se sentir chez soi.`,
        },
        highlights: [],
      },
    },
    {
      key: "menu",
      position: 20,
      content: {
        type: "menu",
        title: profile.menuTitle,
        body: profile.menuBody,
        showPrices: true,
      },
    },
    {
      key: "hours",
      position: 30,
      content: {
        type: "hours",
        title: { en: "Hours", fr: "Heures d’ouverture" },
        entries: [
          {
            day: { en: "Every day", fr: "Tous les jours" },
            hours: { en: hours, fr: hours },
          },
        ],
      },
    },
    {
      key: "loyalty",
      position: 40,
      content: {
        type: "loyalty",
        title: profile.loyaltyTitle,
        body: loyaltyBody(profile.family, stampsRequired, rewardLabel),
        action: {
          label: { en: "Add your card", fr: "Ajouter votre carte" },
          href: "#loyalty",
        },
      },
    },
    {
      key: "contact",
      position: 50,
      content: {
        type: "contact",
        title: { en: "Come say hello", fr: "Venez nous voir" },
        body: {
          en: `Find us in ${neighborhood}.`,
          fr: `Retrouvez-nous à ${neighborhood}.`,
        },
        instagram,
      },
    },
  ]);
}
