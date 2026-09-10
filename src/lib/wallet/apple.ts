import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { connect } from "node:http2";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { appUrl, createToken } from "@/lib/ids";
import { isAppleWalletConfigured } from "@/lib/config";
import { sha1Hex, zipUncompressed } from "@/lib/wallet/zip";
import type { PassPlatform } from "@/lib/types";
import { translate, type Locale } from "@/lib/i18n";

export type WalletPassModel = {
  serial: string;
  authenticationToken: string;
  merchantName: string;
  rewardLabel: string;
  stampsRequired: number;
  stampCount: number;
  backgroundColor: string;
  primaryColor: string;
  lastMessage: string | null;
  logoUrl: string | null;
  locale: Locale;
};

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) {
    return "rgb(244,239,230)";
  }
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}

export function passJson(model: WalletPassModel): Record<string, unknown> {
  const remaining = Math.max(model.stampsRequired - model.stampCount, 0);
  const t = (key: Parameters<typeof translate>[1]) => translate(model.locale, key);
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
    serialNumber: model.serial,
    teamIdentifier: process.env.APPLE_TEAM_ID,
    organizationName: model.merchantName,
    description: `${model.merchantName} — ${t("stampCard")}`,
    logoText: model.logoUrl ? undefined : model.merchantName,
    foregroundColor: hexToRgb(model.primaryColor),
    backgroundColor: hexToRgb(model.backgroundColor),
    labelColor: hexToRgb(model.primaryColor),
    webServiceURL: `${appUrl()}/api/apple-wallet/`,
    authenticationToken: model.authenticationToken,
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: model.serial,
        messageEncoding: "iso-8859-1",
        altText: model.serial,
      },
    ],
    storeCard: {
      headerFields: [
        {
          key: "stamps",
          label: t("walletStamps"),
          value: `${model.stampCount}/${model.stampsRequired}`,
        },
      ],
      primaryFields: [
        {
          key: "brand",
          label: t("walletLoyalty"),
          value: model.merchantName,
        },
      ],
      secondaryFields: [
        {
          key: "reward",
          label: t("walletReward"),
          value: model.rewardLabel,
        },
      ],
      auxiliaryFields: [
        {
          key: "left",
          label: t("walletToGo"),
          value: remaining === 0 ? t("walletReady") : String(remaining),
        },
      ],
      backFields: [
        // The only field carrying a changeMessage, so the lock screen alert is
        // always this text. iOS drops the alert unless the message contains
        // %@, and it shows just one field per update.
        {
          key: "message",
          label: t("walletLatest"),
          value: model.lastMessage ?? t("walletCollect"),
          changeMessage: "%@",
        },
      ],
    },
  };
}

function iconSvg(): Buffer {
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="87" height="87" viewBox="0 0 87 87"><rect width="87" height="87" rx="19" fill="#1c1914"/><path d="M26 20h10v19l16-19h13L47 41l19 26H53L40 49l-4 5v13H26z" fill="#f4efe6"/></svg>',
  );
}

type PassAsset = { name: string; data: Uint8Array };
export const APPLE_PASS_ASSET_NAMES = [
  "icon.png",
  "icon@2x.png",
  "icon@3x.png",
  "logo.png",
  "logo@2x.png",
] as const;

async function merchantLogo(url: string | null): Promise<Buffer | null> {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".public.blob.vercel-storage.com")
    ) {
      return null;
    }
    const response = await fetch(parsed, {
      cache: "force-cache",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return null;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.byteLength <= 1_000_000 ? bytes : null;
  } catch {
    return null;
  }
}

export async function createApplePassAssets(
  model: WalletPassModel,
): Promise<PassAsset[]> {
  const fallback = await sharp(iconSvg()).png().toBuffer();
  const uploadedLogo = await merchantLogo(model.logoUrl);
  const logoSource = uploadedLogo ?? fallback;
  const image = (source: Buffer) =>
    sharp(source, { limitInputPixels: 16_000_000 }).png();

  return [
    { name: "icon.png", data: await image(fallback).resize(29, 29).toBuffer() },
    { name: "icon@2x.png", data: await image(fallback).resize(58, 58).toBuffer() },
    { name: "icon@3x.png", data: await image(fallback).resize(87, 87).toBuffer() },
    {
      name: "logo.png",
      data: await image(logoSource)
        .resize(160, 50, { fit: "contain" })
        .toBuffer(),
    },
    {
      name: "logo@2x.png",
      data: await image(logoSource)
        .resize(320, 100, { fit: "contain" })
        .toBuffer(),
    },
  ];
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with ${code}`));
    });
  });
}

export async function createApplePkpass(model: WalletPassModel): Promise<Buffer> {
  if (!isAppleWalletConfigured()) {
    throw new Error("Apple Wallet is not configured");
  }

  const json = Buffer.from(JSON.stringify(passJson(model)));
  const assets = await createApplePassAssets(model);
  const manifest = Buffer.from(
    JSON.stringify(
      Object.fromEntries([
        ["pass.json", sha1Hex(json)],
        ...assets.map((asset) => [asset.name, sha1Hex(asset.data)]),
      ]),
    ),
  );

  const dir = await mkdtemp(join(tmpdir(), "keeps-pass-"));
  const cert = Buffer.from(process.env.APPLE_PASS_CERT ?? "", "base64").toString("utf8");
  const key = Buffer.from(process.env.APPLE_PASS_KEY ?? "", "base64").toString("utf8");
  const wwdr = Buffer.from(process.env.APPLE_WWDR_CERT ?? "", "base64").toString("utf8");
  const passphrase = process.env.APPLE_PASS_KEY_PASSPHRASE ?? "";

  try {
    await writeFile(join(dir, "manifest.json"), manifest);
    await writeFile(join(dir, "cert.pem"), cert);
    await writeFile(join(dir, "key.pem"), key);
    await writeFile(join(dir, "wwdr.pem"), wwdr);
    const signArgs = [
      "smime",
      "-binary",
      "-sign",
      "-certfile",
      join(dir, "wwdr.pem"),
      "-signer",
      join(dir, "cert.pem"),
      "-inkey",
      join(dir, "key.pem"),
      "-in",
      join(dir, "manifest.json"),
      "-out",
      join(dir, "signature"),
      "-outform",
      "DER",
      "-nodetach",
    ];
    if (passphrase) {
      signArgs.push("-passin", `pass:${passphrase}`);
    }
    await run("openssl", signArgs);
    const signature = await readFile(join(dir, "signature"));
    return zipUncompressed([
      { name: "pass.json", data: json },
      { name: "manifest.json", data: manifest },
      { name: "signature", data: signature },
      ...assets,
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function sendApplePush(pushToken: string): Promise<void> {
  if (!isAppleWalletConfigured()) {
    return;
  }
  const cert = Buffer.from(process.env.APPLE_PASS_CERT ?? "", "base64").toString(
    "utf8",
  );
  const key = Buffer.from(process.env.APPLE_PASS_KEY ?? "", "base64").toString(
    "utf8",
  );
  const passphrase = process.env.APPLE_PASS_KEY_PASSPHRASE || undefined;
  const topic = process.env.APPLE_PASS_TYPE_ID ?? "";

  await new Promise<void>((resolve, reject) => {
    const client = connect("https://api.push.apple.com", {
      cert,
      key,
      passphrase,
    });
    client.once("error", reject);
    client.setTimeout(8_000, () => {
      client.destroy();
      reject(new Error("Apple Wallet push timed out."));
    });
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${encodeURIComponent(pushToken)}`,
      "apns-topic": topic,
      "apns-push-type": "background",
      "apns-priority": "5",
    });
    request.setEncoding("utf8");
    request.on("response", (headers) => {
      const status = Number(headers[":status"] ?? 500);
      request.resume();
      request.on("end", () => {
        client.close();
        if (status === 200) {
          resolve();
        } else {
          reject(new Error(`Apple Wallet push failed (${status}).`));
        }
      });
    });
    request.once("error", (error) => {
      client.close();
      reject(error);
    });
    request.end("{}");
  });
}

export function defaultAuthToken(): string {
  return createToken();
}

export function inferJoinPlatform(userAgent: string | null): PassPlatform {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|Macintosh/i.test(ua)) {
    return "apple";
  }
  if (/Android/i.test(ua)) {
    return "google";
  }
  return "demo";
}
