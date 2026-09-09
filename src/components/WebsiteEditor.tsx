"use client";

import { useActionState, useState } from "react";
import { updateWebsite } from "@/app/actions/website";
import { SITE_KINDS, SITE_TEMPLATES } from "@/lib/site";
import { useI18n } from "@/components/I18nProvider";

type WebsiteEditorProps = {
  slug: string;
  siteTemplate: string;
  siteKind: string;
  neighborhood: string;
  hours: string;
  knownFor: string;
  instagram: string;
  tagline: string;
  about: string;
  sitePublished: boolean;
  aiReady: boolean;
};

export function WebsiteEditor(props: WebsiteEditorProps) {
  const { t } = useI18n();
  const [siteTemplate, setSiteTemplate] = useState(props.siteTemplate);
  const [siteKind, setSiteKind] = useState(props.siteKind);
  const [generate, setGenerate] = useState(true);
  const [state, action, pending] = useActionState(
    async (_prev: { error: string } | { saved: true; usedAi: boolean } | undefined, formData: FormData) =>
      updateWebsite(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="siteTemplate" value={siteTemplate} />
      <input type="hidden" name="siteKind" value={siteKind} />
      {generate ? <input type="hidden" name="generate" value="on" /> : null}

      <section>
        <h2 className="font-serif text-2xl">{t("template")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {SITE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSiteTemplate(template.id)}
              className="rounded-2xl border border-line px-4 py-3 text-left"
              style={{ borderColor: siteTemplate === template.id ? "var(--ink)" : "var(--line)" }}
            >
              <span className="font-semibold">{template.label}</span>
              <span className="mt-1 block text-xs text-muted">{template.vibe}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-2xl">{t("fewQuestions")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold sm:col-span-2">
            {t("kindOfShop")}
            <div className="mt-2 flex flex-wrap gap-2">
              {SITE_KINDS.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  onClick={() => setSiteKind(kind.id)}
                  className="rounded-full border border-line px-3 py-1 text-sm"
                  style={{ borderColor: siteKind === kind.id ? "var(--ink)" : "var(--line)" }}
                >
                  {kind.label}
                </button>
              ))}
            </div>
          </label>
          <label className="block text-sm font-semibold">
            {t("neighborhood")}
            <input className="field mt-1" name="neighborhood" defaultValue={props.neighborhood} placeholder="Mile End" />
          </label>
          <label className="block text-sm font-semibold">
            {t("hours")}
            <input className="field mt-1" name="hours" required defaultValue={props.hours} placeholder="Tue–Sun 8am–4pm" />
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">
            {t("knownFor")}
            <input
              className="field mt-1"
              name="knownFor"
              defaultValue={props.knownFor}
              placeholder="Oat cortados and a quiet back table"
            />
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">
            Instagram
            <input className="field mt-1" name="instagram" defaultValue={props.instagram} placeholder="yourshop" />
          </label>
        </div>
      </section>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={generate}
          onChange={(event) => setGenerate(event.target.checked)}
          className="mt-1"
        />
        <span>
          {t("writePage")}{" "}
          {props.aiReady
            ? t("aiReady")
            : t("aiLater")}
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="sitePublished" defaultChecked={props.sitePublished} className="mt-1" />
        <span>{t("publishPage")}</span>
      </label>

      {!generate ? (
        <div className="grid gap-4">
          <label className="block text-sm font-semibold">
            {t("tagline")}
            <input className="field mt-1" name="tagline" defaultValue={props.tagline} />
          </label>
          <label className="block text-sm font-semibold">
            {t("about")}
            <textarea className="field mt-1 min-h-28" name="about" defaultValue={props.about} />
          </label>
        </div>
      ) : (
        <>
          <input type="hidden" name="tagline" value={props.tagline} />
          <input type="hidden" name="about" value={props.about} />
        </>
      )}

      {state && "error" in state ? <p className="text-sm text-stamp">{state.error}</p> : null}
      {state && "saved" in state ? (
        <p className="text-sm text-forest">
          {state.usedAi ? t("siteSavedAi") : t("siteSavedAnswers")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? t("building") : t("saveWebsite")}
        </button>
        <a className="btn btn-ghost" href={`/s/${props.slug}`} target="_blank" rel="noreferrer">
          {t("openPublicPage")}
        </a>
      </div>
    </form>
  );
}
