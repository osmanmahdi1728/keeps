import { importPKCS8, SignJWT } from "jose";
import { GoogleAuth } from "google-auth-library";
import { isGoogleWalletConfigured } from "@/lib/config";
import { appUrl } from "@/lib/ids";
import type { WalletPassModel } from "@/lib/wallet/apple";

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

function loyaltyClass(model: WalletPassModel, programId: string) {
  return {
    id: classId(programId),
    issuerName: model.merchantName,
    reviewStatus: "UNDER_REVIEW",
    programName: `${model.merchantName} stamps`,
    hexBackgroundColor: model.backgroundColor,
  };
}

function loyaltyObject(model: WalletPassModel, programId: string) {
  const remaining = Math.max(model.stampsRequired - model.stampCount, 0);
  return {
    id: objectId(model.serial),
    classId: classId(programId),
    state: "ACTIVE",
    accountId: model.serial,
    loyaltyPoints: {
      label: "Stamps",
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
        header: "Reward",
        body: model.rewardLabel,
      },
      {
        id: "progress",
        header: "To go",
        body: remaining === 0 ? "Ready to redeem" : String(remaining),
      },
      {
        id: "note",
        header: "Latest note",
        body: model.lastMessage ?? "Show this card at the counter.",
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
  const cls = loyaltyClass(model, programId);
  const object = loyaltyObject(model, programId);

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
  const object = {
    ...loyaltyObject(model, programId),
    textModulesData: [
      ...loyaltyObject(model, programId).textModulesData,
    ],
    notifyPreference: "notifyOnUpdate",
    messages: model.lastMessage
      ? [
          {
            header: model.merchantName,
            body: model.lastMessage,
            messageType: "TEXT_AND_NOTIFY",
          },
        ]
      : [],
  };
  await client.request({
    url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${object.id}`,
    method: "PATCH",
    data: object,
  });
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
