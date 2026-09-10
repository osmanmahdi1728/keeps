import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGooglePlace } from "@/lib/google-places";
import { suggestImportedBranding } from "@/lib/import-branding";
import { draftWebsite } from "@/lib/site-ai";
import { inferSiteKind, suggestProgram } from "@/lib/site-kinds";
import { analyzeBusinessWebsite } from "@/lib/website-analysis";

test("Google Place responses normalize into cache-safe facts", () => {
  const place = normalizeGooglePlace({
    id: "place-1",
    displayName: { text: "North Star Café", languageCode: "en" },
    primaryType: "cafe",
    formattedAddress: "1 Test Street, Montréal, QC",
    location: { latitude: 45.5, longitude: -73.6 },
    nationalPhoneNumber: "514-555-0100",
    websiteUri: "https://example.com/",
    regularOpeningHours: { weekdayDescriptions: ["Monday: 8:00 AM – 6:00 PM"] },
    rating: 4.8,
    userRatingCount: 42,
    googleMapsUri: "https://maps.google.com/?cid=1",
    photos: [
      {
        name: "places/place-1/photos/photo-1",
        widthPx: 1200,
        heightPx: 800,
        authorAttributions: [
          { displayName: "Sample photographer", uri: "https://example.com/profile" },
        ],
      },
    ],
  });

  assert.equal(place.name, "North Star Café");
  assert.equal(place.ratingCount, 42);
  assert.equal(place.photos[0].attribution[0].name, "Sample photographer");
});

test("brand suggestions honor valid website theme colors", () => {
  const branding = suggestImportedBranding("beauty_salon", "#336699");
  assert.ok(
    [branding.primaryColor, branding.accentColor].includes("#336699"),
  );
  assert.equal(branding.fontFamily, "cormorant");
});

test("AI drafting has a complete deterministic bilingual fallback", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const draft = await draftWebsite({
      name: "North Star Café",
      kind: "cafe",
      answers: {
        neighborhood: { en: "Mile End", fr: "Mile End" },
        hours: { en: "8–6", fr: "8 h à 18 h" },
        knownFor: { en: "Small-batch coffee", fr: "Café en petits lots" },
      },
      rewardLabel: "Free coffee",
      stampsRequired: 10,
      instagram: "",
    });
    assert.equal(draft.usedAi, false);
    assert.equal(draft.sections.length, 6);
    assert.ok(draft.sections.every((section) => "fr" in section.content.title));
  } finally {
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
  }
});

test("a drafted booking link is rejected instead of published", async () => {
  const input = {
    name: "North Star Café",
    kind: "cafe",
    answers: {
      neighborhood: { en: "Mile End", fr: "Mile End" },
      hours: { en: "8–6", fr: "8 h à 18 h" },
      knownFor: { en: "Small-batch coffee", fr: "Café en petits lots" },
    },
    rewardLabel: "Free coffee",
    stampsRequired: 10,
    instagram: "",
  };
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;

  delete process.env.OPENAI_API_KEY;
  const clean = await draftWebsite(input);
  const poisoned = {
    menuItems: clean.menuItems,
    sections: clean.sections.map((section) =>
      section.content.type === "contact"
        ? {
            ...section,
            content: {
              ...section.content,
              booking: { url: "https://attacker.example/collect" },
            },
          }
        : section,
    ),
  };

  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(poisoned) } }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch;

  try {
    const draft = await draftWebsite(input);
    assert.equal(draft.usedAi, false);
    const contact = draft.sections.find(
      (section) => section.content.type === "contact",
    );
    assert.ok(contact && contact.content.type === "contact");
    assert.equal(contact.content.booking, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey) {
      process.env.OPENAI_API_KEY = previousKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  }
});

test("specific listing types beat the generic ones they contain", () => {
  assert.equal(inferSiteKind("nail_salon"), "nails");
  assert.equal(inferSiteKind("hair_salon"), "salon");
  assert.equal(inferSiteKind("beauty_salon"), "lashbrow");
  assert.equal(inferSiteKind("bubble_tea_store"), "bubbletea");
  assert.equal(inferSiteKind("barber_shop"), "barber");
  assert.equal(inferSiteKind("ice_cream_shop"), "dessert");
  assert.equal(inferSiteKind("coffee_shop"), "cafe");
  assert.equal(inferSiteKind("hardware_store"), "cafe");
});

test("appointment trades get a visit-sized reward, counters get a basket-sized one", () => {
  assert.deepEqual(suggestProgram("nails"), {
    rewardLabel: "$15 off a full set",
    stampsRequired: 6,
  });
  assert.deepEqual(suggestProgram("cafe"), {
    rewardLabel: "Free drink",
    stampsRequired: 10,
  });
  assert.deepEqual(suggestProgram("not-a-real-kind"), suggestProgram("cafe"));
});

test("website analysis blocks private network targets", async () => {
  await assert.rejects(
    () => analyzeBusinessWebsite("http://127.0.0.1/secret"),
    /public address/,
  );
});
