import { importPKCS8, SignJWT } from "jose";
import { GoogleAuth } from "google-auth-library";
import { isGoogleWalletConfigured } from "@/lib/config";
import { appUrl } from "@/lib/ids";
import type { WalletPassModel } from "@/lib/wallet/apple";
import { translate } from "@/lib/i18n";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function serviceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing");
  }
  return JSON.parse(raw) as ServiceAccount;
}

function classId(programId: string): string {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID ?? "issuer";
  const safe = programId.replace(/[^a-zA-Z0-9._]/g, "_");
  return `${issuer}.keeps_${safe}`;
}

function objectId(serial: string): string {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID ?? "issuer";
  return `${issuer}.${serial}`;
}

export function googleSaveUrl(jwt: string): string {
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

function walletLogo(model: WalletPassModel) {
  if (!model.logoUrl) {
    return undefined;
  }
  try {
    const url = new URL(model.logoUrl);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".public.blob.vercel-storage.com")
    ) {
      return undefined;
    }
    return {
      sourceUri: { uri: url.toString() },
      contentDescription: {
        defaultValue: {
          language: model.locale === "fr" ? "fr-CA" : "en-CA",
          value: `${model.merchantName} logo`,
        },
      },
    };
  } catch {
    return undefined;
  }
}

export function googleLoyaltyClass(model: WalletPassModel, programId: string) {
  const stamps = translate(model.locale, "walletStamps").toLocaleLowerCase(model.locale);
  return {
    id: classId(programId),
    issuerName: model.merchantName,
    reviewStatus: "UNDER_REVIEW",
    programName: `${model.merchantName} ${stamps}`,
    hexBackgroundColor: model.backgroundColor,
    programLogo: walletLogo(model),
  };
}

export function googleLoyaltyObject(model: WalletPassModel, programId: string) {
  const remaining = Math.max(model.stampsRequired - model.stampCount, 0);
  const t = (key: Parameters<typeof translate>[1]) => translate(model.locale, key);
  return {
    id: objectId(model.serial),
    classId: classId(programId),
    state: "ACTIVE",
    accountId: model.serial,
    loyaltyPoints: {
      label: t("walletStamps"),
      balance: { int: model.stampCount },
    },
    barcode: {
      type: "QR_CODE",
      value: model.serial,
      alternateText: model.serial,
    },
    textModulesData: [
      {
        id: "reward",
        header: t("walletReward"),
        body: model.rewardLabel,
      },
      {
        id: "progress",
        header: t("walletToGo"),
        body: remaining === 0 ? t("walletReady") : String(remaining),
      },
      {
        id: "note",
        header: t("walletLatest"),
        body: model.lastMessage ?? t("showCode"),
      },
    ],
    hexBackgroundColor: model.backgroundColor,
  };
}

async function walletClient() {
  const auth = new GoogleAuth({
    credentials: serviceAccount(),
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });
  return auth.getClient();
}

export async function upsertGoogleLoyalty(model: WalletPassModel, programId: string): Promise<string> {
  if (!isGoogleWalletConfigured()) {
    throw new Error("Google Wallet is not configured");
  }

  const client = await walletClient();
  const cls = googleLoyaltyClass(model, programId);
  const object = googleLoyaltyObject(model, programId);

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${cls.id}`,
      method: "GET",
    });
  } catch {
    await client.request({
      url: "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass",
      method: "POST",
      data: cls,
    });
  }

  try {
    await client.request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${object.id}`,
      method: "PUT",
      data: object,
    });
  } catch {
    await client.request({
      url: "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject",
      method: "POST",
      data: object,
    });
  }

  return object.id;
}

export async function notifyGoogleObject(model: WalletPassModel, programId: string): Promise<void> {
  if (!isGoogleWalletConfigured()) {
    return;
  }
  const client = await walletClient();
  const base = googleLoyaltyObject(model, programId);
  const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${base.id}`;
  const message = (messageType: "TEXT" | "TEXT_AND_NOTIFY") =>
    model.lastMessage
      ? [
          {
            id: "keeps-latest",
            header: model.merchantName,
            body: model.lastMessage,
            messageType,
          },
        ]
      : [];

  try {
    await client.request({
      url,
      method: "PATCH",
      // notifyPreference is ephemeral: Google only notifies when it is resent
      // on every request.
      data: { ...base, notifyPreference: "NOTIFY_ON_UPDATE", messages: message("TEXT_AND_NOTIFY") },
    });
  } catch (error) {
    if (!isNotifyQuotaError(error)) {
      throw error;
    }
    // Past 3 notifications in 24h. Still show the note on the pass, silently.
    await client.request({
      url,
      method: "PATCH",
      data: { ...base, messages: message("TEXT") },
    });
  }
}

export function isNotifyQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const status = (error as { status?: number; code?: number }).status ??
    (error as { code?: number }).code;
  if (status === 429) {
    return true;
  }
  return /quotaexceeded/i.test(
    (error as { message?: string }).message ?? "",
  );
}

export async function createGoogleSaveJwt(model: WalletPassModel): Promise<string> {
  const account = serviceAccount();
  const key = await importPKCS8(account.private_key, "RS256");
  const origins = [appUrl()];
  return new SignJWT({
    iss: account.client_email,
    aud: "google",
    origins,
    typ: "savetowallet",
    payload: {
      loyaltyObjects: [{ id: objectId(model.serial) }],
    },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

export { objectId as googleObjectId };
