import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
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
  const changeMessage = model.lastMessage ?? t("walletUpdated");
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
    serialNumber: model.serial,
    teamIdentifier: process.env.APPLE_TEAM_ID,
    organizationName: model.merchantName,
    description: `${model.merchantName} — ${t("stampCard")}`,
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
          changeMessage,
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
        {
          key: "message",
          label: t("walletLatest"),
          value: model.lastMessage ?? t("walletCollect"),
        },
      ],
    },
  };
}

function iconPng(): Uint8Array {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAD4AAAA+CAYAAABzz0z2AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAnUlEQVR4nO3YMQ6AIAxA0XL/QzNyExg6aKIm2v8SJwwk5bU0AKjW2ltmrtd7R8zM3DMjIu6Z+Xg+Z+Y9M1/P58y8Z+br+ZyZ98x8PZ8z856Zr+dzZt4z8/V8zsx7Zr6ez5l5z8zX8zkz75n5ej5n5j0zX8/nzLxn5uv5nJn3zHw9nzPznpmv53Nm3jPz9XzOzHtmvp7PmXnPzNfzOTPvmfl6PmfmPTNfz+fMvGfm6/mcmffMfD2fM/OemQ8AAAD//wMAF8gG3m9x0nQAAAAASUVORK5CYII=",
    "base64",
  );
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
  const icon = iconPng();
  const manifest = Buffer.from(
    JSON.stringify({
      "pass.json": sha1Hex(json),
      "icon.png": sha1Hex(icon),
      "paula.r@example.org": sha1Hex(icon),
      "carlos.r@example.net": sha1Hex(icon),
    }),
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
      { name: "icon.png", data: icon },
      { name: "paula.r@example.org", data: icon },
      { name: "carlos.r@example.net", data: icon },
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function sendApplePush(pushToken: string): Promise<void> {
  if (!isAppleWalletConfigured()) {
    return;
  }
  console.info("[keeps apple push queued]", pushToken.slice(0, 8));
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
