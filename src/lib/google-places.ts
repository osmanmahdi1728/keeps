import { z } from "zod";
import { resolve4, resolve6 } from "node:dns/promises";
import https, { type RequestOptions } from "node:https";
import { isIP } from "node:net";

const GOOGLE_PLACES_BASE = "https://places.googleapis.com/v1";
const SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.primaryType",
].join(",");
const DETAIL_FIELDS = [
  "id",
  "displayName",
  "primaryType",
  "formattedAddress",
  "location",
  "nationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "photos",
].join(",");

const localizedGoogleTextSchema = z.object({
  text: z.string(),
  languageCode: z.string().optional(),
});

const placeSearchResponseSchema = z.object({
  places: z
    .array(
      z.object({
        id: z.string(),
        displayName: localizedGoogleTextSchema,
        formattedAddress: z.string().optional(),
        primaryType: z.string().optional(),
      }),
    )
    .default([]),
});

const placeDetailsSchema = z.object({
  id: z.string(),
  displayName: localizedGoogleTextSchema,
  primaryType: z.string().optional(),
  formattedAddress: z.string().optional(),
  location: z
    .object({ latitude: z.number(), longitude: z.number() })
    .optional(),
  nationalPhoneNumber: z.string().optional(),
  websiteUri: z.string().url().optional(),
  regularOpeningHours: z
    .object({
      weekdayDescriptions: z.array(z.string()).optional(),
    })
    .optional(),
  rating: z.number().min(0).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
  googleMapsUri: z.string().url().optional(),
  photos: z
    .array(
      z.object({
        name: z.string(),
        widthPx: z.number().int().positive().optional(),
        heightPx: z.number().int().positive().optional(),
        authorAttributions: z
          .array(
            z.object({
              displayName: z.string(),
              uri: z.string().url().optional(),
              photoUri: z.string().url().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

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
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  phone: z.string(),
  website: z.string(),
  hours: z.array(z.string()),
  rating: z.number().nullable(),
  ratingCount: z.number().int().nonnegative(),
  mapsUrl: z.string(),
  photos: z.array(
    z.object({
      name: z.string(),
      width: z.number().int().positive().nullable(),
      height: z.number().int().positive().nullable(),
      attribution: z.array(
        z.object({
          name: z.string(),
          uri: z.string(),
        }),
      ),
    }),
  ),
});

export type NormalizedPlace = z.infer<typeof normalizedPlaceSchema>;

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error("Google Places is not configured.");
  }
  return key;
}

async function googleRequest(
  url: string,
  init: RequestInit,
  fieldMask: string,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": fieldMask,
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google Places request failed (${response.status}).`);
  }
  return response.json() as Promise<unknown>;
}

export async function searchGooglePlaces(
  query: string,
  locale: "en" | "fr",
): Promise<PlaceSearchResult[]> {
  const payload = await googleRequest(
    `${GOOGLE_PLACES_BASE}/places:searchText`,
    {
      method: "POST",
      body: JSON.stringify({
        textQuery: query,
        languageCode: locale,
        regionCode: "CA",
        maxResultCount: 6,
      }),
    },
    SEARCH_FIELDS,
  );
  return placeSearchResponseSchema.parse(payload).places.map((place) => ({
    id: place.id,
    name: place.displayName.text,
    address: place.formattedAddress ?? "",
    primaryType: place.primaryType ?? "",
  }));
}

export function normalizeGooglePlace(payload: unknown): NormalizedPlace {
  const place = placeDetailsSchema.parse(payload);
  return {
    id: place.id,
    name: place.displayName.text,
    primaryType: place.primaryType ?? "",
    address: place.formattedAddress ?? "",
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    phone: place.nationalPhoneNumber ?? "",
    website: place.websiteUri ?? "",
    hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? 0,
    mapsUrl: place.googleMapsUri ?? "",
    photos: (place.photos ?? []).slice(0, 6).map((photo) => ({
      name: photo.name,
      width: photo.widthPx ?? null,
      height: photo.heightPx ?? null,
      attribution: (photo.authorAttributions ?? []).map((attribution) => ({
        name: attribution.displayName,
        uri: attribution.uri ?? "",
      })),
    })),
  };
}

export async function getGooglePlace(placeId: string): Promise<NormalizedPlace> {
  const payload = await googleRequest(
    `${GOOGLE_PLACES_BASE}/places/${encodeURIComponent(placeId)}`,
    { method: "GET" },
    DETAIL_FIELDS,
  );
  return normalizeGooglePlace(payload);
}

export async function downloadGooglePhoto(
  photoName: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (!/^places\/[^/]+\/photos\/[^/]+$/.test(photoName)) {
    throw new Error("Invalid Google photo reference.");
  }
  const requestUrl = new URL(`${GOOGLE_PLACES_BASE}/${photoName}/media`);
  requestUrl.searchParams.set("maxWidthPx", "1600");
  requestUrl.searchParams.set("skipHttpRedirect", "true");
  requestUrl.searchParams.set("key", apiKey());
  const metadataResponse = await fetch(requestUrl, {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!metadataResponse.ok) {
    throw new Error("Could not load Google photo.");
  }
  const metadata = z
    .object({ photoUri: z.string().url() })
    .parse(await metadataResponse.json());
  return downloadPinnedGoogleImage(metadata.photoUri);
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("fec") ||
    normalized.startsWith("fed") ||
    normalized.startsWith("fee") ||
    normalized.startsWith("fef") ||
    normalized.startsWith("64:ff9b:")
  ) {
    return true;
  }
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) {
    return isPrivateAddress(mappedIpv4);
  }
  const octets = normalized.split(".").map(Number);
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    octets[0] === 0 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
    octets[0] >= 224
  );
}

async function downloadPinnedGoogleImage(
  rawUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isIP(hostname) ||
    (hostname !== "googleusercontent.com" &&
      !hostname.endsWith(".googleusercontent.com"))
  ) {
    throw new Error("Google returned an unsupported photo URL.");
  }
  const addresses = [
    ...(await resolve4(hostname).catch(() => [])),
    ...(await resolve6(hostname).catch(() => [])),
  ];
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error("Google photo did not resolve publicly.");
  }
  const address = addresses[0];
  const family = isIP(address) as 4 | 6;
  const options: RequestOptions = {
    headers: { Accept: "image/jpeg,image/png,image/webp" },
    lookup: (_lookupHostname, _lookupOptions, callback) => {
      callback(null, address, family);
    },
    timeout: 15_000,
  };
  return new Promise((resolve, reject) => {
    const request = https.get(url, options, (response) => {
      const status = response.statusCode ?? 0;
      const contentType =
        response.headers["content-type"]?.split(";")[0]?.trim() ?? "";
      const contentLength = Number(response.headers["content-length"] ?? "0");
      if (
        status < 200 ||
        status >= 300 ||
        !["image/jpeg", "image/png", "image/webp"].includes(contentType) ||
        contentLength > 4_000_000
      ) {
        response.resume();
        reject(new Error("Google photo is not a supported image."));
        return;
      }
      const chunks: Uint8Array[] = [];
      let byteLength = 0;
      response.on("data", (chunk: Buffer | Uint8Array) => {
        const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
        byteLength += bytes.byteLength;
        if (byteLength > 4_000_000) {
          response.destroy(new Error("Google photo is too large."));
          return;
        }
        chunks.push(bytes);
      });
      response.on("end", () => {
        const bytes = new Uint8Array(byteLength);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        resolve({ bytes, contentType });
      });
      response.on("error", reject);
    });
    request.on("timeout", () =>
      request.destroy(new Error("Google photo request timed out.")),
    );
    request.on("error", reject);
  });
}
