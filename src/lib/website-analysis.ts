import { Buffer } from "node:buffer";
import { resolve4, resolve6 } from "node:dns/promises";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { z } from "zod";

const MAX_HTML_BYTES = 600_000;
const MAX_REDIRECTS = 3;

export type WebsiteAnalysis = {
  url: string;
  title: string;
  description: string;
  themeColor: string;
  imageUrls: string[];
  text: string;
};

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
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
  if (normalized.includes(":")) {
    return (
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }
  const octets = address.split(".").map(Number);
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

type ResolvedPublicUrl = {
  url: URL;
  address: string;
  family: 4 | 6;
};

async function assertPublicUrl(rawUrl: string): Promise<ResolvedPublicUrl> {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only public HTTP websites can be analyzed.");
  }
  if (isIP(url.hostname)) {
    throw new Error("IP-literal website addresses are not supported.");
  }
  if (url.port && !["80", "443"].includes(url.port)) {
    throw new Error("That website port is not supported.");
  }

  const addresses = [
    ...(await resolve4(url.hostname).catch(() => [])),
    ...(await resolve6(url.hostname).catch(() => [])),
  ];
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error("That website does not resolve to a public address.");
  }
  const address = addresses[0];
  return { url, address, family: isIP(address) as 4 | 6 };
}

async function readLimitedHtml(response: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of response) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.byteLength;
    if (length > MAX_HTML_BYTES) {
      response.destroy();
      throw new Error("That website page is too large.");
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function fetchPublicHtml(rawUrl: string): Promise<{ html: string; url: URL }> {
  let resolved = await assertPublicUrl(rawUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const transport = resolved.url.protocol === "https:" ? https : http;
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const request = transport.get(resolved.url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "KeepsBusinessImporter/1.0",
        },
        timeout: 12_000,
        lookup: (_hostname, _options, callback) => {
          callback(null, resolved.address, resolved.family);
        },
      }, resolve);
      request.on("timeout", () => request.destroy(new Error("Website request timed out.")));
      request.on("error", reject);
    });
    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400) {
      const location = response.headers.location;
      if (!location || redirects === MAX_REDIRECTS) {
        response.resume();
        throw new Error("That website redirected too many times.");
      }
      response.resume();
      resolved = await assertPublicUrl(
        new URL(location, resolved.url).toString(),
      );
      continue;
    }
    const contentType = response.headers["content-type"]?.toLowerCase() ?? "";
    if (status < 200 || status >= 300 || !contentType.includes("text/html")) {
      response.resume();
      throw new Error("That URL did not return a public web page.");
    }
    return { html: await readLimitedHtml(response), url: resolved.url };
  }
  throw new Error("Could not load that website.");
}

function decodeEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code)),
    );
}

function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];
  return decodeEntities(patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean) ?? "");
}

function absoluteWebUrl(value: string, baseUrl: URL): string | null {
  try {
    const url = new URL(decodeEntities(value), baseUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function analyzeBusinessWebsite(rawUrl: string): Promise<WebsiteAnalysis> {
  const normalizedInput = z.string().trim().url().max(500).parse(rawUrl);
  const { html, url } = await fetchPublicHtml(normalizedInput);
  const title = decodeEntities(
    metaContent(html, "og:title") ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      "",
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const description = (
    metaContent(html, "og:description") || metaContent(html, "description")
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  const themeColor = metaContent(html, "theme-color").match(/^#[0-9a-f]{6}$/i)?.[0] ?? "";

  const imageCandidates = [
    metaContent(html, "og:image"),
    ...Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi), (match) => match[1]),
  ];
  const imageUrls = [
    ...new Set(
      imageCandidates
        .map((candidate) => absoluteWebUrl(candidate, url))
        .filter((candidate): candidate is string => Boolean(candidate)),
    ),
  ].slice(0, 8);

  const text = decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8_000);

  return {
    url: url.toString(),
    title,
    description,
    themeColor,
    imageUrls,
    text,
  };
}
