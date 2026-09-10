"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateProgram } from "@/app/actions/program";
import {
  WalletCardPreview,
  type WalletPreviewPlatform,
} from "@/components/WalletCardPreview";
import {
  accessibleTextColor,
  CARD_TEMPLATES,
  contrastRatio,
} from "@/lib/card-design";
import { paletteFromImage } from "@/lib/palette-from-image";
import { useI18n } from "@/components/I18nProvider";

type CardDesignerProps = {
  name: string;
  rewardLabel: string;
  stampsRequired: number;
  description: string;
  logoUrl: string;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  gradientEnd: string;
  fontFamily: string;
  templateId: string;
  slug: string;
  joinUrl: string;
  appleReady: boolean;
  googleReady: boolean;
};

export function CardDesigner(props: CardDesignerProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [previewPlatform, setPreviewPlatform] =
    useState<WalletPreviewPlatform>("apple");
  const [name, setName] = useState(props.name);
  const [rewardLabel, setRewardLabel] = useState(props.rewardLabel);
  const [stampsRequired, setStampsRequired] = useState(props.stampsRequired);
  const [description, setDescription] = useState(props.description);
  const [logoUrl, setLogoUrl] = useState(props.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(props.primaryColor);
  const [backgroundColor, setBackgroundColor] = useState(props.backgroundColor);
  const [accentColor, setAccentColor] = useState(props.accentColor);
  const [gradientEnd, setGradientEnd] = useState(props.gradientEnd);
  const [fontFamily, setFontFamily] = useState(props.fontFamily);
  const [templateId, setTemplateId] = useState(props.templateId);
  const [paletteNote, setPaletteNote] = useState<string | null>(null);
  const [styleFilter, setStyleFilter] = useState<
    "minimal" | "classic" | "bold"
  >("minimal");
  const [previewStampCount, setPreviewStampCount] = useState(
    Math.min(3, props.stampsRequired),
  );
  const [previewMessage, setPreviewMessage] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const previewCount = Math.min(previewStampCount, stampsRequired);
  const ratio = contrastRatio(primaryColor, backgroundColor);
  const contrastIsReadable = ratio >= 4.5;

  useEffect(() => {
    if (!logoUrl.startsWith("blob:")) {
      return;
    }
    return () => URL.revokeObjectURL(logoUrl);
  }, [logoUrl]);

  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; saved?: boolean } | undefined, formData: FormData) =>
      updateProgram(formData),
    undefined,
  );

  function applyTemplate(id: string) {
    const template = CARD_TEMPLATES.find((item) => item.id === id);
    if (!template) {
      return;
    }
    setTemplateId(template.id);
    setPrimaryColor(template.primaryColor);
    setBackgroundColor(template.backgroundColor);
    setAccentColor(template.accentColor);
    setGradientEnd(template.gradientEnd);
    setFontFamily(template.fontFamily);
  }

  async function onLogo(file: File | undefined) {
    if (!file) {
      return;
    }
    const preview = URL.createObjectURL(file);
    setLogoUrl(preview);
    setRemoveLogo(false);
    try {
      const palette = await paletteFromImage(file);
      setPrimaryColor(palette.primaryColor);
      setBackgroundColor(palette.backgroundColor);
      setAccentColor(palette.accentColor);
      setGradientEnd(palette.gradientEnd);
      setTemplateId("custom");
      setPaletteNote(t("paletteSuccess"));
    } catch {
      setPaletteNote(t("paletteFailure"));
    }
  }

  function clearLogo() {
    setLogoUrl("");
    setRemoveLogo(true);
    setPaletteNote(null);
    if (logoInput.current) {
      logoInput.current.value = "";
    }
  }

  function updateColor(
    setter: (value: string) => void,
    value: string,
  ) {
    setter(value);
    setTemplateId("custom");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <form action={action} className="space-y-8">
        <input type="hidden" name="primaryColor" value={primaryColor} />
        <input type="hidden" name="backgroundColor" value={backgroundColor} />
        <input type="hidden" name="accentColor" value={accentColor} />
        <input type="hidden" name="gradientEnd" value={gradientEnd} />
        <input type="hidden" name="fontFamily" value={fontFamily} />
        <input type="hidden" name="templateId" value={templateId} />
        <input type="hidden" name="logoUrl" value={logoUrl.startsWith("blob:") ? props.logoUrl : logoUrl} />
        <input type="hidden" name="removeLogo" value={removeLogo ? "yes" : "no"} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stamp">
            {t("cardSetupProgress", { current: step + 1, total: 4 })}
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <span
                key={`setup-progress-${item}`}
                className="h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    item <= step ? accentColor : "var(--line)",
                }}
              />
            ))}
          </div>
          <h2 className="font-serif mt-5 text-3xl">
            {t(
              step === 0
                ? "cardSetupProgram"
                : step === 1
                  ? "cardSetupLook"
                  : step === 2
                    ? "cardSetupBrand"
                    : "cardSetupLaunch",
            )}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {t(
              step === 0
                ? "cardSetupProgramHelp"
                : step === 1
                  ? "cardSetupLookHelp"
                  : step === 2
                    ? "cardSetupBrandHelp"
                    : "cardSetupLaunchHelp",
            )}
          </p>
        </div>

        <section className={step === 0 ? "block" : "hidden"}>
          <h2 className="font-serif text-2xl">{t("shop")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold sm:col-span-2">
              {t("shopName")}
              <input className="field mt-1" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold">
              {t("reward")}
              <input
                className="field mt-1"
                name="rewardLabel"
                required
                value={rewardLabel}
                onChange={(e) => setRewardLabel(e.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold">
              {t("stampsNeeded")}
              <input
                className="field mt-1"
                name="stampsRequired"
                type="number"
                min={3}
                max={20}
                value={stampsRequired}
                onChange={(e) => setStampsRequired(Number(e.target.value))}
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              {t("description")}
              <textarea
                className="field mt-1 min-h-24"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className={step === 1 ? "block" : "hidden"}>
          <h2 className="font-serif text-2xl">{t("templates")}</h2>
          <p className="mt-1 text-sm text-muted">{t("templatesHelp")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["minimal", "classic", "bold"] as const).map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={styleFilter === style}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  styleFilter === style
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-card text-muted"
                }`}
                onClick={() => setStyleFilter(style)}
              >
                {t(
                  style === "minimal"
                    ? "styleMinimal"
                    : style === "classic"
                      ? "styleClassic"
                      : "styleBold",
                )}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CARD_TEMPLATES.filter(
              (template) => template.style === styleFilter,
            ).map((template) => (
              <button
                key={template.id}
                type="button"
                aria-pressed={templateId === template.id}
                onClick={() => applyTemplate(template.id)}
                className="rounded-2xl border px-4 py-3 text-left"
                style={{
                  borderColor: templateId === template.id ? template.accentColor : "var(--line)",
                  backgroundColor: template.backgroundColor,
                  color: template.primaryColor,
                }}
              >
                <span className="block font-semibold">{template.name}</span>
                <span className="mt-1 block text-xs opacity-70">{template.vibe}</span>
                <span className="mt-3 flex gap-1.5">
                  {[
                    template.backgroundColor,
                    template.primaryColor,
                    template.accentColor,
                  ].map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full border border-current/15"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 rounded-xl border border-line bg-card p-3 text-xs leading-5 text-muted">
            {t("walletTypographyNote")}
          </p>
        </section>

        <section className={step === 2 ? "block" : "hidden"}>
          <h2 className="font-serif text-2xl">{t("logo")}</h2>
          <p className="mt-1 text-sm text-muted">{t("logoHelp")}</p>
          <label
            htmlFor="card-logo"
            className="mt-4 flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-line bg-card p-4 transition hover:border-ink"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void onLogo(event.dataTransfer.files[0]);
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-16 w-16 rounded-2xl bg-white object-contain p-1"
              />
            ) : (
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold"
                style={{
                  backgroundColor: accentColor,
                  color: accessibleTextColor(accentColor),
                }}
              >
                {name.trim().charAt(0).toUpperCase() || "K"}
              </span>
            )}
            <span>
              <span className="block text-sm font-semibold">
                {logoUrl ? t("replaceLogo") : t("uploadLogo")}
              </span>
              <span className="mt-1 block text-xs text-muted">
                {t("logoDropHelp")}
              </span>
            </span>
            <input
              ref={logoInput}
              id="card-logo"
              className="sr-only"
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => void onLogo(event.target.files?.[0])}
            />
          </label>
          {logoUrl ? (
            <button
              className="mt-3 text-sm font-semibold text-muted underline-offset-4 hover:underline"
              type="button"
              onClick={clearLogo}
            >
              {t("removeLogo")}
            </button>
          ) : null}
          {paletteNote ? <p className="mt-2 text-sm text-muted">{paletteNote}</p> : null}
        </section>

        <section className={step === 2 ? "block" : "hidden"}>
          <h2 className="font-serif text-2xl">{t("colorGrade")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ColorField
              label={t("ink")}
              value={primaryColor}
              onChange={(value) => updateColor(setPrimaryColor, value)}
            />
            <ColorField
              label={t("cardStart")}
              value={backgroundColor}
              onChange={(value) => updateColor(setBackgroundColor, value)}
            />
            <ColorField
              label={t("accent")}
              value={accentColor}
              onChange={(value) => updateColor(setAccentColor, value)}
            />
          </div>
          <div
            className={`mt-4 rounded-xl border p-4 ${
              contrastIsReadable
                ? "border-forest/20 bg-forest/5"
                : "border-stamp/30 bg-stamp/5"
            }`}
          >
            <p className="text-sm font-semibold">
              {contrastIsReadable
                ? t("contrastGood")
                : t("contrastNeedsWork")}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t("contrastRatio", { ratio: ratio.toFixed(1) })}
            </p>
            {!contrastIsReadable ? (
              <button
                className="btn btn-ghost mt-3"
                type="button"
                onClick={() =>
                  updateColor(
                    setPrimaryColor,
                    accessibleTextColor(backgroundColor),
                  )
                }
              >
                {t("fixContrast")}
              </button>
            ) : null}
          </div>
        </section>

        <section className={step === 3 ? "block" : "hidden"}>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-sm font-semibold">{t("walletReadiness")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <WalletStatus label="Apple Wallet" ready={props.appleReady} />
              <WalletStatus label="Google Wallet" ready={props.googleReady} />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">
              {t("customerJoinLink")}
            </p>
            <p className="mt-1 break-all font-mono text-xs">{props.joinUrl}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/join/${props.slug}`}
              alt={t("joinQr")}
              className="mt-4 h-36 w-36 rounded-xl bg-white p-2"
            />
          </div>
        </section>

        {state && "error" in state ? <p className="text-sm text-stamp">{state.error}</p> : null}
        {state && "saved" in state ? (
          <p className="text-sm text-forest">{t("cardSaved")}</p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              {t("back")}
            </button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setStep((current) => Math.min(3, current + 1))}
            >
              {t("continue")}
            </button>
          ) : (
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? t("saving") : t("saveAndLaunch")}
            </button>
          )}
        </div>
      </form>

      <aside className="lg:sticky lg:top-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{t("livePreview")}</p>
          <div className="flex rounded-full border border-line bg-card p-1 text-xs font-semibold">
            {(["apple", "google"] as const).map((platform) => (
              <button
                key={platform}
                type="button"
                aria-pressed={previewPlatform === platform}
                className="rounded-full px-3 py-1.5 capitalize"
                style={{
                  backgroundColor:
                    previewPlatform === platform ? "var(--ink)" : "transparent",
                  color:
                    previewPlatform === platform ? "var(--paper)" : "var(--ink)",
                }}
                onClick={() => setPreviewPlatform(platform)}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>
        <WalletCardPreview
          platform={previewPlatform}
          merchantName={name || t("yourShop")}
          rewardLabel={rewardLabel || t("reward")}
          stampsRequired={stampsRequired || 10}
          stampCount={previewCount}
          logoUrl={logoUrl || null}
          backgroundColor={backgroundColor}
          primaryColor={primaryColor}
          accentColor={accentColor}
          lastMessage={previewMessage || null}
        />
        <div className="mt-5 space-y-4 rounded-2xl border border-line bg-card p-4">
          <label className="block text-xs font-semibold">
            <span className="flex items-center justify-between gap-3">
              <span>{t("previewStamps")}</span>
              <span className="font-mono text-muted">
                {previewCount}/{stampsRequired}
              </span>
            </span>
            <input
              className="mt-3 w-full accent-stamp"
              type="range"
              min={0}
              max={Math.max(stampsRequired, 1)}
              value={previewCount}
              onChange={(event) =>
                setPreviewStampCount(Number(event.target.value))
              }
            />
          </label>
          <label className="block text-xs font-semibold">
            {t("previewMessage")}
            <input
              className="field mt-2"
              value={previewMessage}
              maxLength={90}
              placeholder={t("previewMessagePlaceholder")}
              onChange={(event) => setPreviewMessage(event.target.value)}
            />
          </label>
        </div>
      </aside>
    </div>
  );
}

function WalletStatus({ label, ready }: { label: string; ready: boolean }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-line bg-white/70 p-3">
      <p className="font-semibold">{label}</p>
      <p className={`mt-1 text-xs ${ready ? "text-forest" : "text-muted"}`}>
        {ready ? t("walletReadyToIssue") : t("walletPreviewMode")}
      </p>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-1 flex gap-2">
        <input
          type="color"
          className="h-11 w-14 cursor-pointer border border-line bg-white"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}
