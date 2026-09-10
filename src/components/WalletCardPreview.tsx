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
  serial?: string;
};

// Mirrors the real layouts: Apple shows the logo and a header field up top, the
// stamp strip across the middle, then a secondary/auxiliary row. Google leads
// with a circular logo and its points balance. Both centre the barcode.
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
  serial,
}: WalletCardPreviewProps) {
  const { t } = useI18n();
  const collected = Math.min(Math.max(stampCount, 0), stampsRequired);
  const remaining = Math.max(stampsRequired - collected, 0);
  const isApple = platform === "apple";

  return (
    <div
      className={`mx-auto w-full max-w-[21.5rem] overflow-hidden shadow-[0_20px_60px_rgba(17,15,12,0.22)] ${
        isApple ? "rounded-[1.25rem]" : "rounded-[1rem]"
      }`}
      style={{ backgroundColor, color: primaryColor }}
    >
      <header className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <PassLogo
            logoUrl={logoUrl}
            merchantName={merchantName}
            accentColor={accentColor}
            backgroundColor={backgroundColor}
            rounded={isApple ? "rounded-[0.6rem]" : "rounded-full"}
          />
          <div className="min-w-0">
            {!isApple ? <FieldLabel>{t("walletLoyalty")}</FieldLabel> : null}
            <p className="truncate text-[0.9375rem] font-semibold leading-5">
              {merchantName}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <FieldLabel>{t("walletStamps")}</FieldLabel>
          <p className="text-[1.375rem] font-semibold leading-7 tabular-nums">
            {collected}
            <span className="opacity-45">/{stampsRequired}</span>
          </p>
        </div>
      </header>

      <StampStrip
        stampsRequired={stampsRequired}
        collected={collected}
        accentColor={accentColor}
        backgroundColor={backgroundColor}
        primaryColor={primaryColor}
      />

      <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4 px-5 pb-1">
        <div className="min-w-0">
          <FieldLabel>{t("walletReward")}</FieldLabel>
          <p className="mt-1 truncate text-[1.0625rem] font-semibold leading-6">
            {rewardLabel}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <FieldLabel>{t("walletToGo")}</FieldLabel>
          <p
            className="mt-1 truncate text-[1.0625rem] font-semibold leading-6"
            style={remaining === 0 ? { color: accentColor } : undefined}
          >
            {remaining === 0 ? t("walletReady") : remaining}
          </p>
        </div>
      </div>

      {lastMessage ? (
        <p className="mt-4 border-t border-current/10 px-5 pt-3 text-[0.8125rem] leading-5 opacity-70">
          {lastMessage}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col items-center gap-2 px-5 pb-5">
        <div className="rounded-[0.625rem] bg-white p-2.5">
          <MockQr />
        </div>
        {serial ? (
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] opacity-50">
            {serial}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.14em] opacity-55">
      {children}
    </p>
  );
}

function PassLogo({
  logoUrl,
  merchantName,
  accentColor,
  backgroundColor,
  rounded,
}: {
  logoUrl?: string | null;
  merchantName: string;
  accentColor: string;
  backgroundColor: string;
  rounded: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={`h-10 w-10 shrink-0 bg-white object-contain p-[3px] ${rounded}`}
      />
    );
  }
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center text-base font-bold ${rounded}`}
      style={{ backgroundColor: accentColor, color: backgroundColor }}
    >
      {merchantName.trim().charAt(0).toUpperCase() || "K"}
    </span>
  );
}

// The strip is where real stamp cards put their grid, so the progress reads at
// a glance instead of hiding inside a text field.
function StampStrip({
  stampsRequired,
  collected,
  accentColor,
  backgroundColor,
  primaryColor,
}: {
  stampsRequired: number;
  collected: number;
  accentColor: string;
  backgroundColor: string;
  primaryColor: string;
}) {
  const showGrid = stampsRequired <= 12;
  const percent = stampsRequired
    ? Math.round((collected / stampsRequired) * 100)
    : 0;

  return (
    <div className="relative my-4 px-5 py-4">
      <span
        aria-hidden
        className="absolute inset-0 opacity-[0.09]"
        style={{ backgroundColor: accentColor }}
      />
      {showGrid ? (
        <div className="relative grid grid-cols-5 gap-2">
          {Array.from({ length: stampsRequired }, (_, index) => {
            const filled = index < collected;
            return (
              <span
                key={`stamp-${index}`}
                className="flex aspect-square items-center justify-center rounded-full text-[0.625rem] font-semibold tabular-nums"
                style={{
                  backgroundColor: filled ? accentColor : "transparent",
                  border: `1.5px ${filled ? "solid" : "dashed"} ${accentColor}`,
                  color: filled ? backgroundColor : primaryColor,
                  opacity: filled ? 1 : 0.55,
                }}
              >
                {filled ? "★" : index + 1}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="relative">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: `${accentColor}33` }}
          >
            <span
              className="block h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: accentColor }}
            />
          </div>
          <p className="mt-2 text-[0.6875rem] font-semibold opacity-65">
            {collected}/{stampsRequired}
          </p>
        </div>
      )}
    </div>
  );
}

// A static stand-in with real finder patterns, so the preview reads as a
// scannable code without pretending to encode a live serial.
function MockQr() {
  const modules = 21;
  const isFinder = (row: number, column: number) => {
    const inBox = (r0: number, c0: number) =>
      row >= r0 && row < r0 + 7 && column >= c0 && column < c0 + 7;
    return inBox(0, 0) || inBox(0, modules - 7) || inBox(modules - 7, 0);
  };
  const finderOn = (row: number, column: number) => {
    const r = row < 7 ? row : row - (modules - 7);
    const c = column < 7 ? column : column - (modules - 7);
    const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
    return ring !== 2;
  };

  return (
    <div
      className="grid h-[4.5rem] w-[4.5rem]"
      style={{ gridTemplateColumns: `repeat(${modules}, 1fr)` }}
      aria-hidden
    >
      {Array.from({ length: modules * modules }, (_, index) => {
        const row = Math.floor(index / modules);
        const column = index % modules;
        const on = isFinder(row, column)
          ? finderOn(row, column)
          : (row * 7 + column * 5 + ((row * column) % 3)) % 3 === 0;
        return (
          <span
            key={`qr-${index}`}
            style={{ backgroundColor: on ? "#111111" : "transparent" }}
          />
        );
      })}
    </div>
  );
}
