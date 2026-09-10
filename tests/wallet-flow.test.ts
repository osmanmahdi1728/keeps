import assert from "node:assert/strict";
import test from "node:test";
import { settleInBatches } from "@/lib/campaign-delivery";
import {
  accessibleTextColor,
  CARD_TEMPLATES,
  contrastRatio,
} from "@/lib/card-design";
import {
  appleWalletReadiness,
  googleWalletReadiness,
  isExpectedApplePassType,
} from "@/lib/config";
import { customerEntryPath } from "@/lib/site";
import { suggestProgram } from "@/lib/site-kinds";
import {
  APPLE_PASS_ASSET_NAMES,
  createApplePassAssets,
  passJson,
  type WalletPassModel,
} from "@/lib/wallet/apple";
import {
  googleLoyaltyClass,
  googleLoyaltyObject,
  isNotifyQuotaError,
} from "@/lib/wallet/google";
import { parseServiceAccount } from "@/lib/wallet/google-credentials";
import { passDownloadTokenMatches } from "@/lib/wallet/pass-download-token";

const model: WalletPassModel = {
  serial: "serial-1",
  authenticationToken: "token-1",
  merchantName: "North Star Café",
  rewardLabel: "Free drink",
  stampsRequired: 8,
  stampCount: 3,
  backgroundColor: "#f4efe6",
  primaryColor: "#1c1914",
  lastMessage: null,
  logoUrl:
    "https://store.public.blob.vercel-storage.com/merchants/test/logo.png",
  locale: "en",
};

test("customer entry always uses the focused join route", () => {
  assert.equal(customerEntryPath("north-star", true), "/join/north-star");
  assert.equal(customerEntryPath("north-star", false), "/join/north-star");
});

test("business types provide useful card-program defaults", () => {
  assert.deepEqual(suggestProgram("cafe"), {
    rewardLabel: "Free drink",
    stampsRequired: 10,
  });
  assert.deepEqual(suggestProgram("nails"), {
    rewardLabel: "$15 off a full set",
    stampsRequired: 6,
  });
});

test("card styles stay varied and readable", () => {
  assert.deepEqual(
    new Set(CARD_TEMPLATES.map((template) => template.style)),
    new Set(["minimal", "classic", "bold"]),
  );
  assert.ok(
    CARD_TEMPLATES.every(
      (template) =>
        contrastRatio(template.primaryColor, template.backgroundColor) >= 4.5,
    ),
  );
  assert.equal(accessibleTextColor("#111111"), "#ffffff");
  assert.equal(accessibleTextColor("#f7f7f5"), "#111111");
});

test("only the note field notifies, and it uses Apple's %@ escape", () => {
  const previousPassType = process.env.APPLE_PASS_TYPE_ID;
  process.env.APPLE_PASS_TYPE_ID = "pass.com.example.keeps";
  try {
    const storeCard = passJson({ ...model, lastMessage: "Free coffee is ready" })
      .storeCard as Record<string, { key: string; changeMessage?: string }[]>;
    const notifying = Object.values(storeCard)
      .flat()
      .filter((field) => field.changeMessage !== undefined);
    assert.deepEqual(
      notifying.map((field) => field.key),
      ["message"],
    );
    // Without %@ iOS silently swaps in a generic "Store card changed" alert.
    assert.ok(
      notifying.every((field) => field.changeMessage?.includes("%@")),
    );
  } finally {
    if (previousPassType) {
      process.env.APPLE_PASS_TYPE_ID = previousPassType;
    } else {
      delete process.env.APPLE_PASS_TYPE_ID;
    }
  }
});

test("Google service account credentials reject mangled pastes", () => {
  const key = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n";
  const valid = `{"client_email":"bot@keeps.iam.gserviceaccount.com","private_key":"${key}"}`;

  const parsed = parseServiceAccount(valid);
  assert.equal(parsed?.client_email, "bot@keeps.iam.gserviceaccount.com");
  assert.ok(parsed?.private_key.includes("\n"));
  assert.equal(
    parseServiceAccount(Buffer.from(valid).toString("base64"))?.client_email,
    "bot@keeps.iam.gserviceaccount.com",
  );

  // The tab-separated table copy that crashed the join page.
  assert.equal(parseServiceAccount('\ttype\t"service_account"'), null);
  assert.equal(parseServiceAccount(""), null);
  assert.equal(parseServiceAccount(undefined), null);
  assert.equal(parseServiceAccount('{"client_email":"bot@keeps.dev"}'), null);
});

test("Google notification quota errors fall back instead of throwing", () => {
  assert.equal(isNotifyQuotaError({ status: 429 }), true);
  assert.equal(
    isNotifyQuotaError(new Error("QuotaExceededException: too many")),
    true,
  );
  assert.equal(isNotifyQuotaError(new Error("invalid credentials")), false);
  assert.equal(isNotifyQuotaError(null), false);
});

test("Apple pass metadata and assets contain the branded Wallet fields", async () => {
  const previousPassType = process.env.APPLE_PASS_TYPE_ID;
  const previousTeam = process.env.APPLE_TEAM_ID;
  process.env.APPLE_PASS_TYPE_ID = "pass.com.example.keeps";
  process.env.APPLE_TEAM_ID = "TEAM123";
  try {
    const payload = passJson(model);
    assert.equal(payload.organizationName, model.merchantName);
    assert.equal(payload.backgroundColor, "rgb(244,239,230)");
    assert.equal(
      isExpectedApplePassType("pass.com.example.keeps"),
      true,
    );
    assert.deepEqual(APPLE_PASS_ASSET_NAMES, [
      "icon.png",
      "icon@2x.png",
      "icon@3x.png",
      "logo.png",
      "logo@2x.png",
    ]);
    assert.equal(
      APPLE_PASS_ASSET_NAMES.some((name) => name.includes("@example.")),
      false,
    );
    const assets = await createApplePassAssets({ ...model, logoUrl: null });
    assert.deepEqual(
      assets.map((asset) => asset.name),
      [...APPLE_PASS_ASSET_NAMES],
    );
    assert.ok(
      assets.every(
        (asset) =>
          asset.data[0] === 0x89 &&
          asset.data[1] === 0x50 &&
          asset.data[2] === 0x4e &&
          asset.data[3] === 0x47,
      ),
    );
  } finally {
    if (previousPassType) {
      process.env.APPLE_PASS_TYPE_ID = previousPassType;
    } else {
      delete process.env.APPLE_PASS_TYPE_ID;
    }
    if (previousTeam) {
      process.env.APPLE_TEAM_ID = previousTeam;
    } else {
      delete process.env.APPLE_TEAM_ID;
    }
  }
});

test("Google Wallet class and object carry merchant branding and progress", () => {
  const previousIssuer = process.env.GOOGLE_WALLET_ISSUER_ID;
  process.env.GOOGLE_WALLET_ISSUER_ID = "123456";
  try {
    const walletClass = googleLoyaltyClass(model, "program-1");
    const walletObject = googleLoyaltyObject(model, "program-1");
    assert.equal(walletClass.issuerName, model.merchantName);
    assert.equal(
      walletClass.programLogo?.sourceUri.uri,
      model.logoUrl,
    );
    assert.equal(walletObject.loyaltyPoints.balance.int, 3);

    const unsafeClass = googleLoyaltyClass(
      { ...model, logoUrl: "https://attacker.example/logo.png" },
      "program-1",
    );
    assert.equal(unsafeClass.programLogo, undefined);
  } finally {
    if (previousIssuer) {
      process.env.GOOGLE_WALLET_ISSUER_ID = previousIssuer;
    } else {
      delete process.env.GOOGLE_WALLET_ISSUER_ID;
    }
  }
});

test("Wallet readiness reports missing setup without exposing values", () => {
  const apple = appleWalletReadiness();
  const google = googleWalletReadiness();
  assert.equal(typeof apple.ready, "boolean");
  assert.equal(typeof google.ready, "boolean");
  assert.ok(apple.missing.every((item) => item.startsWith("APPLE_")));
  assert.ok(google.missing.every((item) => item.startsWith("GOOGLE_")));
});

test("Wallet downloads require the exact per-pass token", () => {
  assert.equal(passDownloadTokenMatches("secret-token", "secret-token"), true);
  assert.equal(passDownloadTokenMatches("secret-token", "wrong-token"), false);
  assert.equal(passDownloadTokenMatches("secret-token", ""), false);
});

test("campaign delivery counts partial failures accurately", async () => {
  const result = await settleInBatches(
    [1, 2, 3, 4],
    async (value) => {
      if (value % 2 === 0) {
        throw new Error("Synthetic delivery failure");
      }
    },
    2,
  );
  assert.deepEqual(result, { sent: 2, failed: 2 });
});
