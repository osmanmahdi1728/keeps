import assert from "node:assert/strict";
import test from "node:test";
import { suggestImportedBranding } from "@/lib/import-branding";
import { normalizeNominatimPlace } from "@/lib/nominatim";
import { draftWebsite } from "@/lib/site-ai";
import { inferSiteKind, suggestProgram } from "@/lib/site-kinds";
import {
  analyzeBusinessWebsite,
  pinnedLookup,
} from "@/lib/website-analysis";

test("Nominatim responses normalize into safe business facts", () => {
  const place = normalizeNominatimPlace({
    place_id: 123,
    osm_type: "node",
    osm_id: 456,
    lat: "45.5001",
    lon: "-73.6002",
    display_name: "North Star Café, 1 Test Street, Montréal, QC",
    name: "North Star Café",
    category: "amenity",
    type: "cafe",
    extratags: {
      phone: "514-555-0100",
      website: "example.com",
      opening_hours: "Mo-Su 08:00-18:00",
    },
  });

  assert.equal(place.id, "N456");
  assert.equal(place.name, "North Star Café");
  assert.equal(place.latitude, 45.5001);
  assert.equal(place.longitude, -73.6002);
  assert.equal(place.website, "https://example.com/");
  assert.equal(place.mapsUrl, "https://www.openstreetmap.org/node/456");
  assert.equal("hours" in place, false);
  assert.equal("rating" in place, false);
  assert.equal("photos" in place, false);
});

test("Nominatim normalization rejects unsafe website schemes", () => {
  const place = normalizeNominatimPlace({
    place_id: 123,
    osm_type: "way",
    osm_id: 789,
    lat: "45.5",
    lon: "-73.6",
    display_name: "Test Shop, Montréal",
    extratags: { website: "javascript:alert(1)" },
  });

  assert.equal(place.website, "");
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

test("Nominatim accepts listings with null extra tag maps", () => {
  const place = normalizeNominatimPlace({
    place_id: "99",
    osm_type: "Node",
    osm_id: "12",
    lat: "45.5",
    lon: "-73.6",
    display_name: "Corner Shop, Montréal",
    extratags: null,
    namedetails: null,
  });
  assert.equal(place.id, "N12");
  assert.equal(place.website, "");
});

test("Node 22 DNS pinning returns an address list when lookup asks for all", () => {
  const lookup = pinnedLookup("203.0.113.10", 4);
  let allResult: unknown;
  lookup("example.com", { all: true }, (_err, addresses) => {
    allResult = addresses;
  });
  assert.deepEqual(allResult, [{ address: "203.0.113.10", family: 4 }]);

  let singleAddress = "";
  let singleFamily = 0;
  lookup("example.com", {}, (_err, address, family) => {
    singleAddress = String(address);
    singleFamily = Number(family);
  });
  assert.equal(singleAddress, "203.0.113.10");
  assert.equal(singleFamily, 4);
});

test("website analysis blocks private network targets", async () => {
  for (const target of [
    "http://127.0.0.1/secret",
    "http://[::ffff:169.254.169.254]/latest/meta-data",
    "http://[::1]/secret",
  ]) {
    await assert.rejects(
      () => analyzeBusinessWebsite(target),
      /IP-literal|public address/,
    );
  }
});
