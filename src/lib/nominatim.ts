import { z } from "zod";
import { appUrl } from "@/lib/ids";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const MAX_RESULTS = 6;
const REQUEST_INTERVAL_MS = 1_100;

const nominatimPlaceSchema = z.object({
  place_id: z.coerce.number().int().positive(),
  osm_type: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(["node", "way", "relation"])),
  osm_id: z.coerce.number().int().positive(),
  lat: z.string().regex(/^-?\d+(?:\.\d+)?$/),
  lon: z.string().regex(/^-?\d+(?:\.\d+)?$/),
  display_name: z.string().trim().min(1).max(1_000),
  name: z.string().trim().max(300).nullish(),
  type: z.string().trim().max(120).nullish(),
  category: z.string().trim().max(120).nullish(),
  extratags: z.record(z.string(), z.string()).nullish(),
  namedetails: z.record(z.string(), z.string()).nullish(),
});

const nominatimResponseSchema = z.array(nominatimPlaceSchema).max(50);

export type PlaceSearchResult = {
  id: string;
  name: string;
  address: string;
  primaryType: string;
};

export const normalizedPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryType: z.string(),
  address: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string(),
  website: z.string(),
  mapsUrl: z.string().url(),
});

export type NormalizedPlace = z.infer<typeof normalizedPlaceSchema>;

let nextRequestAt = 0;
let requestQueue = Promise.resolve();
const placeCache = new Map<
  string,
  { expiresAt: number; place: NormalizedPlace }
>();

function listingId(place: z.infer<typeof nominatimPlaceSchema>): string {
  const prefix = {
    node: "N",
    way: "W",
    relation: "R",
  }[place.osm_type];
  return `${prefix}${place.osm_id}`;
}

function nameFor(place: z.infer<typeof nominatimPlaceSchema>): string {
  return (
    place.name ||
    place.namedetails?.name ||
    place.display_name.split(",")[0]?.trim() ||
    place.display_name
  );
}

function safeWebsite(
  extratags: Record<string, string> | null | undefined,
): string {
  const candidate =
    extratags?.website || extratags?.["contact:website"] || extratags?.url || "";
  if (!candidate) {
    return "";
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(candidate) && !/^https?:\/\//i.test(candidate)) {
    return "";
  }
  try {
    const url = new URL(
      /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`,
    );
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function normalizeNominatimPlace(payload: unknown): NormalizedPlace {
  const place = nominatimPlaceSchema.parse(payload);
  return normalizedPlaceSchema.parse({
    id: listingId(place),
    name: nameFor(place),
    primaryType: place.type || place.category || "",
    address: place.display_name,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    phone: place.extratags?.phone || place.extratags?.["contact:phone"] || "",
    website: safeWebsite(place.extratags),
    mapsUrl: `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`,
  });
}

async function throttleRequest(): Promise<void> {
  const run = requestQueue.then(async () => {
    const wait = Math.max(0, nextRequestAt - Date.now());
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
  });
  requestQueue = run.catch(() => undefined);
  await run;
}

async function nominatimRequest(url: URL, locale: "en" | "fr"): Promise<unknown> {
  await throttleRequest();
  const configuredOrigin = appUrl();
  let origin = "https://keeps.example";
  try {
    const parsedOrigin = new URL(configuredOrigin);
    if (["http:", "https:"].includes(parsedOrigin.protocol)) {
      origin = parsedOrigin.origin;
    }
  } catch {
    // Use a stable project identifier when APP_URL is malformed.
  }
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": locale,
      Referer: origin,
      "User-Agent": `KeepsLoyalty/1.0 (+${origin})`,
    },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Nominatim request failed (${response.status}).`);
  }
  return response.json() as Promise<unknown>;
}

export async function searchNominatim(
  query: string,
  locale: "en" | "fr",
): Promise<PlaceSearchResult[]> {
  const url = new URL("/search", NOMINATIM_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("accept-language", locale);
  url.searchParams.set("countrycodes", "ca");
  url.searchParams.set("limit", String(MAX_RESULTS));
  const payload = nominatimResponseSchema.parse(
    await nominatimRequest(url, locale),
  );
  return payload.map((place) => ({
    id: listingId(place),
    name: nameFor(place),
    address: place.display_name,
    primaryType: place.type || place.category || "",
  }));
}

export async function getNominatimPlace(
  placeId: string,
  locale: "en" | "fr",
): Promise<NormalizedPlace> {
  if (!/^[NWR]\d+$/.test(placeId)) {
    throw new Error("Invalid OpenStreetMap listing identifier.");
  }
  const cacheKey = `${locale}:${placeId}`;
  const cached = placeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.place;
  }
  const url = new URL("/lookup", NOMINATIM_BASE);
  url.searchParams.set("osm_ids", placeId);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("accept-language", locale);
  const payload = nominatimResponseSchema.parse(
    await nominatimRequest(url, locale),
  );
  if (payload.length !== 1) {
    throw new Error("OpenStreetMap listing was not found.");
  }
  const place = normalizeNominatimPlace(payload[0]);
  if (placeCache.size >= 100) {
    const oldestKey = placeCache.keys().next().value;
    if (oldestKey) {
      placeCache.delete(oldestKey);
    }
  }
  placeCache.set(cacheKey, {
    expiresAt: Date.now() + 30 * 60_000,
    place,
  });
  return place;
}
