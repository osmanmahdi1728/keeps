const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const demoSections = [
  {
    key: "hero",
    type: "hero",
    position: 0,
    content: {
      type: "hero",
      eyebrow: { en: "Mile End, Montréal", fr: "Mile End, Montréal" },
      title: {
        en: "Coffee worth crossing the neighborhood for.",
        fr: "Un café qui vaut le détour.",
      },
      body: {
        en: "Small-batch coffee, flaky pastries, and a warm seat waiting for you.",
        fr: "Café en petits lots, viennoiseries feuilletées et une place chaleureuse qui vous attend.",
      },
      primaryAction: {
        label: { en: "Get the loyalty card", fr: "Obtenir la carte fidélité" },
        href: "#loyalty",
      },
      secondaryAction: {
        label: { en: "Explore the menu", fr: "Découvrir le menu" },
        href: "#menu",
      },
    },
  },
  {
    key: "about",
    type: "about",
    position: 10,
    content: {
      type: "about",
      title: {
        en: "Your everyday café",
        fr: "Votre café de tous les jours",
      },
      body: {
        en: "Demo Cafe brings carefully sourced coffee and buttery house-made pastries to the heart of Mile End.",
        fr: "Demo Cafe propose des cafés soigneusement sélectionnés et des viennoiseries maison au cœur du Mile End.",
      },
      highlights: [
        { en: "Roasted in Montréal", fr: "Torréfié à Montréal" },
        { en: "Pastries baked each morning", fr: "Viennoiseries cuites chaque matin" },
      ],
    },
  },
  {
    key: "menu",
    type: "menu",
    position: 20,
    content: {
      type: "menu",
      title: { en: "Cafe favourites", fr: "Les favoris du café" },
      body: {
        en: "Simple things, made exceptionally well.",
        fr: "Des choses simples, préparées avec grand soin.",
      },
      showPrices: true,
    },
  },
  {
    key: "hours",
    type: "hours",
    position: 30,
    content: {
      type: "hours",
      title: { en: "Hours", fr: "Heures d’ouverture" },
      entries: [
        {
          day: { en: "Monday–Friday", fr: "Lundi–vendredi" },
          hours: { en: "7:00 AM–6:00 PM", fr: "7 h–18 h" },
        },
        {
          day: { en: "Saturday–Sunday", fr: "Samedi–dimanche" },
          hours: { en: "8:00 AM–5:00 PM", fr: "8 h–17 h" },
        },
      ],
      note: {
        en: "Kitchen closes 30 minutes before the café.",
        fr: "La cuisine ferme 30 minutes avant le café.",
      },
    },
  },
  {
    key: "loyalty",
    type: "loyalty",
    position: 40,
    content: {
      type: "loyalty",
      title: {
        en: "Your tenth coffee is on us",
        fr: "Votre dixième café est offert",
      },
      body: {
        en: "Add the card to your phone and collect a stamp with every coffee.",
        fr: "Ajoutez la carte à votre téléphone et recevez une étampe avec chaque café.",
      },
      action: {
        label: { en: "Add my card", fr: "Ajouter ma carte" },
        href: "#card",
      },
    },
  },
  {
    key: "contact",
    type: "contact",
    position: 50,
    content: {
      type: "contact",
      title: { en: "Come say hello", fr: "Venez nous voir" },
      body: {
        en: "A bright corner café in the heart of Mile End.",
        fr: "Un café lumineux au cœur du Mile End.",
      },
      address: {
        en: "123 Demo Street, Montréal, QC",
        fr: "123, rue Demo, Montréal (Québec)",
      },
      instagram: "democafe",
    },
  },
];

const demoMenuItems = [
  {
    key: "espresso",
    position: 0,
    name: { en: "Espresso", fr: "Espresso" },
    description: {
      en: "Chocolate, caramel, and a clean finish.",
      fr: "Chocolat, caramel et finale nette.",
    },
    category: { en: "Coffee", fr: "Café" },
    priceCents: 350,
  },
  {
    key: "maple-latte",
    position: 10,
    name: { en: "Maple latte", fr: "Latte à l’érable" },
    description: {
      en: "Double espresso, silky milk, and Québec maple.",
      fr: "Double espresso, lait soyeux et érable du Québec.",
    },
    category: { en: "Coffee", fr: "Café" },
    priceCents: 575,
  },
  {
    key: "filter-coffee",
    position: 20,
    name: { en: "Daily filter", fr: "Filtre du jour" },
    description: {
      en: "A rotating single-origin coffee, brewed fresh.",
      fr: "Un café d’origine unique en rotation, fraîchement infusé.",
    },
    category: { en: "Coffee", fr: "Café" },
    priceCents: 400,
  },
  {
    key: "butter-croissant",
    position: 30,
    name: { en: "Butter croissant", fr: "Croissant au beurre" },
    description: {
      en: "Flaky, golden, and baked here every morning.",
      fr: "Feuilleté, doré et cuit ici chaque matin.",
    },
    category: { en: "Pastries", fr: "Viennoiseries" },
    priceCents: 450,
  },
  {
    key: "seasonal-toast",
    position: 40,
    name: { en: "Seasonal toast", fr: "Tartine de saison" },
    description: {
      en: "Sourdough with market vegetables and whipped chèvre.",
      fr: "Pain au levain, légumes du marché et chèvre fouetté.",
    },
    category: { en: "Kitchen", fr: "Cuisine" },
    priceCents: 1250,
  },
];

async function main() {
  const email = "owner@keeps.local";
  const passwordHash = await bcrypt.hash("keeps-demo", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: "Demo owner" },
    create: { email, name: "Demo owner", passwordHash },
  });

  const merchant = await prisma.merchant.upsert({
    where: { userId: user.id },
    update: {
      name: "Demo Cafe",
      slug: "demo-cafe",
      siteVersion: 2,
      siteKind: "cafe",
      neighborhood: "Mile End, Montréal",
      hours: "Mon–Fri 7–6 · Sat–Sun 8–5",
      knownFor: "Small-batch coffee and house-made pastries.",
      instagram: "democafe",
      tagline: "Coffee worth crossing the neighborhood for.",
      about:
        "Small-batch coffee, flaky pastries, and a warm seat waiting for you.",
    },
    create: {
      userId: user.id,
      name: "Demo Cafe",
      slug: "demo-cafe",
      primaryColor: "#1c1914",
      backgroundColor: "#f4efe6",
      accentColor: "#c45c26",
      siteVersion: 2,
      siteKind: "cafe",
      neighborhood: "Mile End, Montréal",
      hours: "Mon–Fri 7–6 · Sat–Sun 8–5",
      knownFor: "Small-batch coffee and house-made pastries.",
      instagram: "democafe",
      tagline: "Coffee worth crossing the neighborhood for.",
      about:
        "Small-batch coffee, flaky pastries, and a warm seat waiting for you.",
    },
  });

  await prisma.program.upsert({
    where: { merchantId: merchant.id },
    update: { stampsRequired: 10, rewardLabel: "Free coffee" },
    create: {
      merchantId: merchant.id,
      stampsRequired: 10,
      rewardLabel: "Free coffee",
      description: "Buy nine coffees, the tenth is on us.",
    },
  });

  const menuSection = await prisma.$transaction(async (tx) => {
    let persistedMenuSection = null;

    for (const section of demoSections) {
      const persistedSection = await tx.siteSection.upsert({
        where: {
          merchantId_key: { merchantId: merchant.id, key: section.key },
        },
        update: {
          type: section.type,
          position: section.position,
          enabled: true,
          content: section.content,
        },
        create: {
          merchantId: merchant.id,
          key: section.key,
          type: section.type,
          position: section.position,
          enabled: true,
          content: section.content,
        },
      });

      if (section.key === "menu") {
        persistedMenuSection = persistedSection;
      }
    }

    await tx.siteSection.deleteMany({
      where: {
        merchantId: merchant.id,
        key: { notIn: demoSections.map((section) => section.key) },
      },
    });

    if (!persistedMenuSection) {
      throw new Error("Demo menu section was not created");
    }

    return persistedMenuSection;
  });

  await prisma.$transaction(async (tx) => {
    for (const item of demoMenuItems) {
      await tx.siteMenuItem.upsert({
        where: {
          merchantId_key: { merchantId: merchant.id, key: item.key },
        },
        update: {
          sectionId: menuSection.id,
          name: item.name,
          description: item.description,
          category: item.category,
          priceCents: item.priceCents,
          currency: "CAD",
          position: item.position,
          available: true,
        },
        create: {
          merchantId: merchant.id,
          sectionId: menuSection.id,
          key: item.key,
          name: item.name,
          description: item.description,
          category: item.category,
          priceCents: item.priceCents,
          currency: "CAD",
          position: item.position,
          available: true,
        },
      });
    }

    await tx.siteMenuItem.deleteMany({
      where: {
        merchantId: merchant.id,
        key: { notIn: demoMenuItems.map((item) => item.key) },
      },
    });
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
