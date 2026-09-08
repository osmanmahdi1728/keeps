"use client";

import { useActionState, useMemo, useState } from "react";
import { updateProgram } from "@/app/actions/program";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { CARD_FONTS, CARD_TEMPLATES, fontCss } from "@/lib/card-design";
import { paletteFromImage } from "@/lib/palette-from-image";

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
};

export function CardDesigner(props: CardDesignerProps) {
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

  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; saved?: boolean } | undefined, formData: FormData) =>
      updateProgram(formData),
    undefined,
  );

  const previewFont = useMemo(() => fontCss(fontFamily), [fontFamily]);

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
    try {
      const palette = await paletteFromImage(file);
      setPrimaryColor(palette.primaryColor);
      setBackgroundColor(palette.backgroundColor);
      setAccentColor(palette.accentColor);
      setGradientEnd(palette.gradientEnd);
      setTemplateId("custom");
      setPaletteNote("Colors pulled from your logo. Tweak them if needed.");
    } catch {
      setPaletteNote("Logo added. Could not read a palette from that file.");
    }
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

        <section>
          <h2 className="font-serif text-2xl">Shop</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold sm:col-span-2">
              Shop name
              <input className="field mt-1" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold">
              Reward
              <input
                className="field mt-1"
                name="rewardLabel"
                required
                value={rewardLabel}
                onChange={(e) => setRewardLabel(e.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold">
              Stamps needed
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
              Description
              <textarea
                className="field mt-1 min-h-24"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl">Templates</h2>
          <p className="mt-1 text-sm text-muted">Start from a look, then tune colors and type.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CARD_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.id)}
                className="rounded-2xl border px-4 py-3 text-left"
                style={{
                  borderColor: templateId === template.id ? template.accentColor : "var(--line)",
                  background: `linear-gradient(135deg, ${template.backgroundColor}, ${template.gradientEnd})`,
                  color: template.primaryColor,
                }}
              >
                <span className="block font-semibold">{template.name}</span>
                <span className="mt-1 block text-xs opacity-70">{template.vibe}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl">Logo</h2>
          <p className="mt-1 text-sm text-muted">PNG, JPG, or WebP. We pull a color grade from it.</p>
          <label className="mt-4 block text-sm font-semibold">
            Upload logo
            <input
              className="field mt-1"
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => void onLogo(event.target.files?.[0])}
            />
          </label>
          {paletteNote ? <p className="mt-2 text-sm text-muted">{paletteNote}</p> : null}
        </section>

        <section>
          <h2 className="font-serif text-2xl">Color grade</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ColorField label="Ink" value={primaryColor} onChange={setPrimaryColor} />
            <ColorField label="Card start" value={backgroundColor} onChange={setBackgroundColor} />
            <ColorField label="Card fade" value={gradientEnd} onChange={setGradientEnd} />
            <ColorField label="Stamp" value={accentColor} onChange={setAccentColor} />
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl">Type</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {CARD_FONTS.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => setFontFamily(font.id)}
                className="rounded-xl border border-line px-4 py-3 text-left"
                style={{
                  fontFamily: font.css,
                  borderColor: fontFamily === font.id ? "var(--ink)" : "var(--line)",
                }}
              >
                {font.label}
              </button>
            ))}
          </div>
        </section>

        {state && "error" in state ? <p className="text-sm text-stamp">{state.error}</p> : null}
        {state && "saved" in state ? (
          <p className="text-sm text-forest">Card saved. Customers see this look next time they open it.</p>
        ) : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save card"}
        </button>
      </form>

      <aside className="lg:sticky lg:top-8">
        <p className="mb-3 text-sm font-semibold">Live preview</p>
        <LoyaltyCard
          merchantName={name || "Your shop"}
          rewardLabel={rewardLabel || "Reward"}
          stampsRequired={stampsRequired || 10}
          stampCount={3}
          logoUrl={logoUrl || null}
          backgroundColor={backgroundColor}
          primaryColor={primaryColor}
          accentColor={accentColor}
          gradientEnd={gradientEnd}
          fontFamily={previewFont}
        />
      </aside>
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
