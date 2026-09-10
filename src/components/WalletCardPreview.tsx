"use client";

import { useI18n } from "@/components/I18nProvider";

export type WalletPreviewPlatform = "apple" | "google";

export type WalletCardPreviewProps = {
  platform: WalletPreviewPlatform;
  merchantName: string;
  rewardLabel: string;
  stampsRequired: number;
  stampCount: number;
  logoUrl?: string | null;
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  lastMessage?: string | null;
};

export function WalletCardPreview({
  platform,
  merchantName,
  rewardLabel,
  stampsRequired,
  stampCount,
  logoUrl,
  backgroundColor,
  primaryColor,
  accentColor,
  lastMessage,
}: WalletCardPreviewProps) {
  const { t } = useI18n();
  const remaining = Math.max(stampsRequired - stampCount, 0);

  return (
    <div
      className={`mx-auto w-full max-w-[23rem] overflow-hidden shadow-[0_24px_70px_rgba(20,18,15,0.24)] ${
        platform === "apple" ? "rounded-[1.6rem]" : "rounded-[1.2rem]"
      }`}
      style={{
        backgroundColor,
        color: primaryColor,
      }}
    >
      <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className={`h-11 w-11 shrink-0 bg-white object-contain p-1 ${
                platform === "google" ? "rounded-full" : "rounded-xl"
              }`}
            />
          ) : (
            <span
              className={`h-11 w-11 shrink-0 ${
                platform === "google" ? "rounded-full" : "rounded-xl"
              }`}
              style={{ backgroundColor: accentColor }}
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] opacity-65">
              {platform === "apple" ? "Apple Wallet" : "Google Wallet"}
            </p>
            <h2 className="truncate text-xl font-semibold">{merchantName}</h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
            {t("walletStamps")}
          </p>
          <p className="text-lg font-semibold">
            {stampCount}/{stampsRequired}
          </p>
        </div>
      </div>

      <div className="border-y border-current/10 bg-white/15 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
          {t("walletReward")}
        </p>
        <p className="mt-1 text-lg font-semibold">{rewardLabel}</p>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-5 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
            {t("walletToGo")}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {remaining === 0 ? t("walletReady") : remaining}
          </p>
          {lastMessage ? (
            <p className="mt-2 line-clamp-2 text-xs opacity-70">{lastMessage}</p>
          ) : null}
        </div>
        <div className="grid h-16 w-16 grid-cols-5 gap-0.5 rounded-md bg-white p-2">
          {Array.from({ length: 25 }, (_, index) => (
            <span
              key={`wallet-preview-qr-${index}`}
              style={{
                backgroundColor:
                  index % 3 === 0 || index % 7 === 0
                    ? primaryColor
                    : "transparent",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
