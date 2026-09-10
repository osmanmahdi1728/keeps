export function isAppleWalletConfigured(): boolean {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_PASS_CERT &&
      process.env.APPLE_PASS_KEY &&
      process.env.APPLE_WWDR_CERT,
  );
}

export function isExpectedApplePassType(value: string): boolean {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
      value === process.env.APPLE_PASS_TYPE_ID,
  );
}

export function isGoogleWalletConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  );
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function isDemoMode(): boolean {
  return !isAppleWalletConfigured() || !isGoogleWalletConfigured();
}

export type ServiceReadiness = {
  ready: boolean;
  missing: string[];
};

function readiness(keys: string[]): ServiceReadiness {
  const missing = keys.filter((key) => !process.env[key]);
  return { ready: missing.length === 0, missing };
}

export function appleWalletReadiness(): ServiceReadiness {
  return readiness([
    "APPLE_PASS_TYPE_ID",
    "APPLE_TEAM_ID",
    "APPLE_PASS_CERT",
    "APPLE_PASS_KEY",
    "APPLE_WWDR_CERT",
  ]);
}

export function googleWalletReadiness(): ServiceReadiness & {
  publishing: "demo" | "live";
} {
  return {
    ...readiness([
      "GOOGLE_WALLET_ISSUER_ID",
      "GOOGLE_SERVICE_ACCOUNT_JSON",
    ]),
    publishing:
      process.env.GOOGLE_WALLET_PUBLISHING_STATUS === "live"
        ? "live"
        : "demo",
  };
}

export function emailReadiness(): ServiceReadiness {
  return readiness(["RESEND_API_KEY", "EMAIL_FROM"]);
}
