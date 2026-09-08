"use client";

export type LoyaltyCardProps = {
  merchantName: string;
  rewardLabel: string;
  stampsRequired: number;
  stampCount: number;
  serial?: string;
  qrSrc?: string;
  logoUrl?: string | null;
  backgroundColor: string;
  primaryColor: string;
  accentColor?: string;
  gradientEnd?: string;
  fontFamily?: string;
  lastMessage?: string | null;
};

export function LoyaltyCard(props: LoyaltyCardProps) {
  const accent = props.accentColor ?? props.primaryColor;
  const end = props.gradientEnd ?? props.backgroundColor;
  const filled = Array.from({ length: props.stampsRequired }, (_, i) => i < props.stampCount);

  return (
    <article
      className="w-full max-w-sm overflow-hidden rounded-[28px] p-5 shadow-[0_18px_50px_rgba(40,24,8,0.18)]"
      style={{
        background: `linear-gradient(145deg, ${props.backgroundColor} 0%, ${end} 100%)`,
        color: props.primaryColor,
        fontFamily: props.fontFamily,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase opacity-70">Stamp card</p>
        {props.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.logoUrl}
            alt=""
            className="h-10 w-10 rounded-full bg-white object-cover"
          />
        ) : null}
      </div>
      <h2 className="mt-2 text-3xl leading-none">{props.merchantName}</h2>
      <p className="mt-2 text-sm opacity-80">{props.rewardLabel}</p>
      <div className="mt-5 grid grid-cols-5 gap-2">
        {filled.map((on, i) => (
          <span
            key={`stamp-${i}`}
            className="flex h-9 items-center justify-center rounded-full border text-xs"
            style={{
              borderColor: accent,
              background: on ? accent : "transparent",
              color: on ? props.backgroundColor : props.primaryColor,
            }}
          >
            {on ? "●" : i + 1}
          </span>
        ))}
      </div>
      <div className="mt-6 flex items-end justify-between gap-4">
        {props.qrSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.qrSrc} alt="Card barcode" className="h-24 w-24 bg-white p-2" />
        ) : (
          <div className="grid h-24 w-24 grid-cols-5 gap-0.5 bg-white p-2">
            {Array.from({ length: 25 }, (_, i) => (
              <span
                key={`qr-dot-${i}`}
                className="block"
                style={{ background: i % 3 === 0 ? props.primaryColor : "transparent" }}
              />
            ))}
          </div>
        )}
        <p className="max-w-[10rem] text-right text-xs leading-5 opacity-80">
          {props.lastMessage ?? "Show this code at the counter."}
        </p>
      </div>
    </article>
  );
}
