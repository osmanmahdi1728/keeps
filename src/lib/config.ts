export function isAppleWalletConfigured(): boolean {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_PASS_CERT &&
      process.env.APPLE_PASS_KEY &&
      process.env.APPLE_WWDR_CERT,
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
