import assert from "node:assert/strict";
import test from "node:test";
import { settleInBatches } from "@/lib/campaign-delivery";
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
import { googleLoyaltyClass, googleLoyaltyObject } from "@/lib/wallet/google";
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
