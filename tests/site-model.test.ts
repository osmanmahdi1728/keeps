import assert from "node:assert/strict";
import test from "node:test";
import {
  assembleLegacySiteSections,
  parseStoredSiteSections,
} from "@/lib/site-migrate";
import { createDefaultSiteSections } from "@/lib/site-kinds";
import { siteSectionsSchema } from "@/lib/site-sections";

const merchant = {
  name: "North Star Café",
  neighborhood: "Mile End",
  hours: "8–6",
  knownFor: "Small-batch coffee",
  instagram: "northstar",
  tagline: "Coffee with a compass",
  about: "A quiet café.",
  program: { rewardLabel: "Free coffee", stampsRequired: 10 },
};

test("legacy merchants migrate into complete bilingual sections", () => {
  const sections = assembleLegacySiteSections(merchant);
  assert.deepEqual(
    sections.map((section) => section.content.type),
    ["hero", "about", "menu", "hours", "loyalty", "contact"],
  );
  const hero = sections[0];
  assert.equal(hero.content.type, "hero");
  if (hero.content.type === "hero") {
    assert.equal(hero.content.title.en, merchant.tagline);
    assert.ok(hero.content.title.fr);
  }
});

test("section validation rejects duplicate stable keys", () => {
  const sections = createDefaultSiteSections({ merchantName: "Test Shop" });
  const result = siteSectionsSchema.safeParse([sections[0], sections[0]]);
  assert.equal(result.success, false);
});

test("appointment trades and counter trades get different default copy", () => {
  const barber = createDefaultSiteSections({
    merchantName: "Test Shop",
    siteKind: "barber",
  });
  const cafe = createDefaultSiteSections({
    merchantName: "Test Shop",
    siteKind: "cafe",
  });

  const barberMenu = barber.find((section) => section.content.type === "menu");
  const cafeMenu = cafe.find((section) => section.content.type === "menu");
  assert.ok(barberMenu && cafeMenu);
  assert.notEqual(
    barberMenu.content.type === "menu" ? barberMenu.content.title.en : "",
    cafeMenu.content.type === "menu" ? cafeMenu.content.title.en : "",
  );

  const barberHero = barber[0];
  assert.equal(barberHero.content.type, "hero");
  if (barberHero.content.type === "hero") {
    assert.equal(barberHero.content.secondaryAction?.label.en, "See services");
    assert.ok(barberHero.content.secondaryAction?.label.fr);
  }
});

test("an unknown site kind still produces a complete section set", () => {
  const sections = createDefaultSiteSections({
    merchantName: "Test Shop",
    siteKind: "not-a-real-kind",
  });
  assert.deepEqual(
    sections.map((section) => section.content.type),
    ["hero", "about", "menu", "hours", "loyalty", "contact"],
  );
});

test("booking links must be https", () => {
  const sections = createDefaultSiteSections({ merchantName: "Test Shop" });
  const contact = sections.find(
    (section) => section.content.type === "contact",
  );
  assert.ok(contact && contact.content.type === "contact");

  const withBooking = (url: string) => [
    {
      ...contact,
      content: { ...contact.content, booking: { url } },
    },
  ];

  assert.equal(
    siteSectionsSchema.safeParse(withBooking("https://booksy.com/shop")).success,
    true,
  );
  assert.equal(
    siteSectionsSchema.safeParse(withBooking("http://booksy.com/shop")).success,
    false,
  );
  assert.equal(
    siteSectionsSchema.safeParse(withBooking("javascript:alert(1)")).success,
    false,
  );
});

test("stored section type must match its content discriminator", () => {
  const section = createDefaultSiteSections({ merchantName: "Test Shop" })[0];
  assert.throws(() =>
    parseStoredSiteSections([
      {
        key: section.key,
        type: "about",
        enabled: true,
        position: 0,
        content: section.content,
      },
    ]),
  );
});
