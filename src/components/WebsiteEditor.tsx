"use client";

import {
  useActionState,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  generateWebsiteDraft,
  updateWebsite,
} from "@/app/actions/website";
import { useI18n } from "@/components/I18nProvider";
import { WebsiteEditorPreview } from "@/components/WebsiteEditorPreview";
import { SITE_KINDS, SITE_TEMPLATES } from "@/lib/site";
import {
  type LocalizedText,
  type SiteMenuItem,
  type SiteSection,
  type SiteSectionContent,
} from "@/lib/site-sections";
import { assertNever } from "@/lib/types";

type WebsiteEditorProps = {
  merchantName: string;
  slug: string;
  siteTemplate: string;
  siteKind: string;
  sitePublished: boolean;
  aiReady: boolean;
  answers: {
    neighborhood: LocalizedText;
    hours: LocalizedText;
    knownFor: LocalizedText;
  };
  sections: SiteSection[];
  menuItems: SiteMenuItem[];
  branding: {
    logoUrl: string | null;
    primaryColor: string;
    backgroundColor: string;
    accentColor: string;
    gradientEnd: string;
    fontFamily: string;
  };
};

type Step = "source" | "style" | "answers" | "draft";
type PreviewDevice = "desktop" | "mobile";

const EDITOR_STEPS = [
  { id: "source", label: "editorStep1" },
  { id: "style", label: "editorStep2" },
  { id: "answers", label: "editorStep3" },
  { id: "draft", label: "editorStep4" },
] as const;

function LocalizedFields({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  multiline?: boolean;
}) {
  const { t } = useI18n();
  const controlClass = `field mt-1 ${multiline ? "min-h-24" : ""}`;
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      {(["en", "fr"] as const).map((locale) => (
        <label key={locale} className="block text-xs font-semibold text-muted">
          {locale === "en" ? t("editorEnglish") : t("editorFrench")}
          {multiline ? (
            <textarea
              className={controlClass}
              value={value[locale]}
              onChange={(event) =>
                onChange({ ...value, [locale]: event.target.value })
              }
            />
          ) : (
            <input
              className={controlClass}
              value={value[locale]}
              onChange={(event) =>
                onChange({ ...value, [locale]: event.target.value })
              }
            />
          )}
        </label>
      ))}
    </fieldset>
  );
}

function SectionEditor({
  content,
  onChange,
}: {
  content: SiteSectionContent;
  onChange: (content: SiteSectionContent) => void;
}) {
  const { t } = useI18n();
  switch (content.type) {
    case "hero":
      return (
        <div className="grid gap-4">
          <LocalizedFields
            label={t("editorEyebrow")}
            value={content.eyebrow}
            onChange={(eyebrow) => onChange({ ...content, eyebrow })}
          />
          <LocalizedFields
            label={t("editorTitle")}
            value={content.title}
            onChange={(title) => onChange({ ...content, title })}
          />
          <LocalizedFields
            label={t("editorBody")}
            value={content.body}
            multiline
            onChange={(body) => onChange({ ...content, body })}
          />
        </div>
      );
    case "about":
      return (
        <div className="grid gap-4">
          <LocalizedFields
            label={t("editorTitle")}
            value={content.title}
            onChange={(title) => onChange({ ...content, title })}
          />
          <LocalizedFields
            label={t("editorBody")}
            value={content.body}
            multiline
            onChange={(body) => onChange({ ...content, body })}
          />
        </div>
      );
    case "menu":
      return (
        <div className="grid gap-4">
          <LocalizedFields
            label={t("editorTitle")}
            value={content.title}
            onChange={(title) => onChange({ ...content, title })}
          />
          <LocalizedFields
            label={t("editorBody")}
            value={content.body}
            multiline
            onChange={(body) => onChange({ ...content, body })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={content.showPrices}
              onChange={(event) =>
                onChange({ ...content, showPrices: event.target.checked })
              }
            />
            {t("editorShowPrices")}
          </label>
        </div>
      );
    case "hours": {
      const entry = content.entries[0] ?? {
        day: { en: "", fr: "" },
        hours: { en: "", fr: "" },
      };
      return (
        <div className="grid gap-4">
          <LocalizedFields
            label={t("editorTitle")}
            value={content.title}
            onChange={(title) => onChange({ ...content, title })}
          />
          <LocalizedFields
            label={t("editorDays")}
            value={entry.day}
            onChange={(day) =>
              onChange({ ...content, entries: [{ ...entry, day }] })
            }
          />
          <LocalizedFields
            label={t("hours")}
            value={entry.hours}
            onChange={(hours) =>
              onChange({ ...content, entries: [{ ...entry, hours }] })
            }
          />
        </div>
      );
    }
    case "contact":
      return (
        <div className="grid gap-4">
          <LocalizedFields
            label={t("editorTitle")}
            value={content.title}
            onChange={(title) => onChange({ ...content, title })}
          />
          <LocalizedFields
            label={t("editorBody")}
            value={content.body}
            multiline
            onChange={(body) => onChange({ ...content, body })}
          />
          <LocalizedFields
            label={t("editorAddress")}
            value={content.address ?? { en: "", fr: "" }}
            onChange={(address) => onChange({ ...content, address })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-muted">
              {t("editorPhone")}
              <input
                className="field mt-1"
                value={content.phone ?? ""}
                onChange={(event) =>
                  onChange({ ...content, phone: event.target.value })
                }
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              {t("email")}
              <input
                className="field mt-1"
                type="email"
                value={content.email ?? ""}
                onChange={(event) =>
                  onChange({
                    ...content,
                    email: event.target.value || undefined,
                  })
                }
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Instagram
              <input
                className="field mt-1"
                value={content.instagram ?? ""}
                onChange={(event) =>
                  onChange({ ...content, instagram: event.target.value })
                }
              />
            </label>
          </div>
        </div>
      );
    case "loyalty":
      return (
        <div className="grid gap-4">
          <LocalizedFields
            label={t("editorTitle")}
            value={content.title}
            onChange={(title) => onChange({ ...content, title })}
          />
          <LocalizedFields
            label={t("editorBody")}
            value={content.body}
            multiline
            onChange={(body) => onChange({ ...content, body })}
          />
          <LocalizedFields
            label={t("editorButtonLabel")}
            value={content.action.label}
            onChange={(label) =>
              onChange({ ...content, action: { ...content.action, label } })
            }
          />
        </div>
      );
    default:
      return assertNever(content);
  }
}

function EditorPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-line bg-card p-5 md:p-7">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function WebsiteEditor(props: WebsiteEditorProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("source");
  const [siteTemplate, setSiteTemplate] = useState(props.siteTemplate);
  const [siteKind, setSiteKind] = useState(props.siteKind);
  const [answers, setAnswers] = useState(props.answers);
  const [sections, setSections] = useState(props.sections);
  const [menuItems, setMenuItems] = useState(props.menuItems);
  const [sitePublished, setSitePublished] = useState(props.sitePublished);
  const [previewDevice, setPreviewDevice] =
    useState<PreviewDevice>("desktop");
  const [previewLocale, setPreviewLocale] = useState<"en" | "fr">("en");
  const [draftMessage, setDraftMessage] = useState("");
  const [draftError, setDraftError] = useState("");
  const [generating, startGenerating] = useTransition();
  const [saveState, saveAction, saving] = useActionState(
    async (
      _previous: { error: string } | { saved: true } | undefined,
      formData: FormData,
    ) => updateWebsite(formData),
    undefined,
  );

  function buildDraft() {
    setDraftError("");
    setDraftMessage("");
    startGenerating(async () => {
      const formData = new FormData();
      formData.set("siteKind", siteKind);
      formData.set("answers", JSON.stringify(answers));
      const result = await generateWebsiteDraft(formData);
      if ("error" in result) {
        setDraftError(result.error);
        return;
      }
      setSections(result.sections);
      setMenuItems(result.menuItems);
      setDraftMessage(result.usedAi ? t("editorDraftAi") : t("editorDraftFallback"));
      setStep("draft");
    });
  }

  function updateSectionContent(key: string, content: SiteSectionContent) {
    setSections((current) =>
      current.map((section) =>
        section.key === key ? { ...section, content } : section,
      ),
    );
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) {
      return;
    }
    setSections((current) => {
      const reordered = [...current];
      [reordered[index], reordered[target]] = [
        reordered[target],
        reordered[index],
      ];
      return reordered.map((section, position) => ({
        ...section,
        position: position * 10,
      }));
    });
  }

  function addMenuItem() {
    setMenuItems((current) => [
      ...current,
      {
        key: `item-${Date.now()}`,
        name: { en: "", fr: "" },
        description: { en: "", fr: "" },
        category: { en: "", fr: "" },
        priceCents: null,
        currency: "CAD",
        position: current.length * 10,
        available: true,
      },
    ]);
  }

  const orderedSections = [...sections].sort(
    (first, second) => first.position - second.position,
  );

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 text-xs font-semibold">
        {EDITOR_STEPS.map(
          (editorStep, index) => (
            <span
              key={editorStep.id}
              className={`rounded-full px-3 py-1.5 ${
                step === editorStep.id
                  ? "bg-ink text-paper"
                  : "border border-line text-muted"
              }`}
            >
              {index + 1}. {t(editorStep.label)}
            </span>
          ),
        )}
      </nav>

      {step === "source" ? (
        <EditorPanel title={t("editorChooseStart")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              disabled
              className="rounded-2xl border border-line p-5 text-left opacity-55"
            >
              <span className="font-semibold">{t("editorImport")}</span>
              <span className="mt-2 block text-sm text-muted">
                {t("editorImportLater")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStep("style")}
              className="rounded-2xl border-2 border-stamp bg-white p-5 text-left"
            >
              <span className="font-semibold">{t("editorStartAnswers")}</span>
              <span className="mt-2 block text-sm text-muted">
                {t("editorStartAnswersHelp")}
              </span>
            </button>
          </div>
        </EditorPanel>
      ) : null}

      {step === "style" ? (
        <EditorPanel title={t("editorChooseStyle")}>
          <div className="grid gap-3 sm:grid-cols-3">
            {SITE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSiteTemplate(template.id)}
                className="rounded-2xl border bg-white px-4 py-5 text-left"
                style={{
                  borderColor:
                    siteTemplate === template.id
                      ? props.branding.accentColor
                      : "var(--line)",
                  borderWidth: siteTemplate === template.id ? 2 : 1,
                }}
              >
                <span className="font-semibold">
                  {t(`editorTemplate${template.id}`)}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {t(`editorTemplate${template.id}Help`)}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-between">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setStep("source")}
            >
              {t("editorBack")}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setStep("answers")}
            >
              {t("editorContinue")}
            </button>
          </div>
        </EditorPanel>
      ) : null}

      {step === "answers" ? (
        <EditorPanel title={t("fewQuestions")}>
          <div className="grid gap-5">
            <div>
              <p className="text-sm font-semibold">{t("kindOfShop")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SITE_KINDS.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => setSiteKind(kind.id)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      siteKind === kind.id ? "border-ink bg-ink text-paper" : "border-line"
                    }`}
                  >
                    {t(`editorKind${kind.id}`)}
                  </button>
                ))}
              </div>
            </div>
            <LocalizedFields
              label={t("neighborhood")}
              value={answers.neighborhood}
              onChange={(neighborhood) =>
                setAnswers((current) => ({ ...current, neighborhood }))
              }
            />
            <LocalizedFields
              label={t("knownFor")}
              value={answers.knownFor}
              multiline
              onChange={(knownFor) =>
                setAnswers((current) => ({ ...current, knownFor }))
              }
            />
            <LocalizedFields
              label={t("hours")}
              value={answers.hours}
              onChange={(hours) =>
                setAnswers((current) => ({ ...current, hours }))
              }
            />
            <p className="text-xs text-muted">
              {props.aiReady ? t("editorAiReady") : t("editorAiFallback")}
            </p>
            {draftError ? <p className="text-sm text-stamp">{draftError}</p> : null}
            <div className="flex justify-between">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setStep("style")}
              >
                {t("editorBack")}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={generating}
                onClick={buildDraft}
              >
                {generating ? t("building") : t("editorBuildDraft")}
              </button>
            </div>
          </div>
        </EditorPanel>
      ) : null}

      {step === "draft" ? (
        <form action={saveAction} className="space-y-6">
          <input type="hidden" name="siteTemplate" value={siteTemplate} />
          <input type="hidden" name="siteKind" value={siteKind} />
          <input type="hidden" name="answers" value={JSON.stringify(answers)} />
          <input type="hidden" name="sections" value={JSON.stringify(orderedSections)} />
          <input type="hidden" name="menuItems" value={JSON.stringify(menuItems)} />
          {sitePublished ? (
            <input type="hidden" name="sitePublished" value="on" />
          ) : null}

          {draftMessage ? (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm text-forest">
              {draftMessage}
            </p>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.82fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-3xl">{t("editorEditDraft")}</h2>
                <button
                  type="button"
                  className="text-sm font-semibold underline"
                  onClick={() => setStep("answers")}
                >
                  {t("editorReviseAnswers")}
                </button>
              </div>

              {orderedSections.map((section, index) => (
                <section
                  key={section.key}
                  className="rounded-2xl border border-line bg-card p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {t(`editorSection${section.content.type}`)}
                      </p>
                      <label className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={section.enabled}
                          onChange={(event) =>
                            setSections((current) =>
                              current.map((item) =>
                                item.key === section.key
                                  ? { ...item, enabled: event.target.checked }
                                  : item,
                              ),
                            )
                          }
                        />
                        {t("editorShowSection")}
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-line px-3 py-1 text-xs"
                        disabled={index === 0}
                        onClick={() => moveSection(index, -1)}
                        aria-label={t("editorMoveUp")}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-line px-3 py-1 text-xs"
                        disabled={index === orderedSections.length - 1}
                        onClick={() => moveSection(index, 1)}
                        aria-label={t("editorMoveDown")}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <SectionEditor
                      content={section.content}
                      onChange={(content) =>
                        updateSectionContent(section.key, content)
                      }
                    />
                  </div>
                </section>
              ))}

              <section className="rounded-2xl border border-line bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{t("editorMenuItems")}</h3>
                  <button
                    type="button"
                    className="rounded-full border border-line px-3 py-1 text-xs font-semibold"
                    onClick={addMenuItem}
                  >
                    + {t("editorAddItem")}
                  </button>
                </div>
                <div className="mt-4 space-y-5">
                  {menuItems.map((item, index) => (
                    <div
                      key={item.key}
                      className="rounded-xl border border-line bg-white p-4"
                    >
                      <LocalizedFields
                        label={t("name")}
                        value={item.name}
                        onChange={(name) =>
                          setMenuItems((current) =>
                            current.map((currentItem) =>
                              currentItem.key === item.key
                                ? { ...currentItem, name }
                                : currentItem,
                            ),
                          )
                        }
                      />
                      <div className="mt-4">
                        <LocalizedFields
                          label={t("description")}
                          value={item.description ?? { en: "", fr: "" }}
                          multiline
                          onChange={(description) =>
                            setMenuItems((current) =>
                              current.map((currentItem) =>
                                currentItem.key === item.key
                                  ? { ...currentItem, description }
                                  : currentItem,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="mt-4">
                        <LocalizedFields
                          label={t("editorCategory")}
                          value={item.category ?? { en: "", fr: "" }}
                          onChange={(category) =>
                            setMenuItems((current) =>
                              current.map((currentItem) =>
                                currentItem.key === item.key
                                  ? { ...currentItem, category }
                                  : currentItem,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-end gap-3">
                        <label className="text-xs font-semibold text-muted">
                          {t("editorPrice")}
                          <input
                            className="field mt-1 w-32"
                            inputMode="decimal"
                            value={
                              item.priceCents === null
                                ? ""
                                : (item.priceCents / 100).toFixed(2)
                            }
                            onChange={(event) => {
                              const price = Number(event.target.value);
                              setMenuItems((current) =>
                                current.map((currentItem) =>
                                  currentItem.key === item.key
                                    ? {
                                        ...currentItem,
                                        priceCents:
                                          event.target.value === "" ||
                                          !Number.isFinite(price)
                                            ? null
                                            : Math.max(0, Math.round(price * 100)),
                                      }
                                    : currentItem,
                                ),
                              );
                            }}
                          />
                        </label>
                        <label className="mb-3 flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={item.available}
                            onChange={(event) =>
                              setMenuItems((current) =>
                                current.map((currentItem) =>
                                  currentItem.key === item.key
                                    ? {
                                        ...currentItem,
                                        available: event.target.checked,
                                      }
                                    : currentItem,
                                ),
                              )
                            }
                          />
                          {t("editorAvailable")}
                        </label>
                        <button
                          type="button"
                          className="mb-2 ml-auto text-xs font-semibold text-stamp underline"
                          onClick={() =>
                            setMenuItems((current) =>
                              current
                                .filter((currentItem) => currentItem.key !== item.key)
                                .map((currentItem, position) => ({
                                  ...currentItem,
                                  position: position * 10,
                                })),
                            )
                          }
                        >
                          {t("editorRemove")}
                        </button>
                        <span className="sr-only">{index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <WebsiteEditorPreview
              branding={props.branding}
              device={previewDevice}
              locale={previewLocale}
              menuItems={menuItems}
              merchantName={props.merchantName}
              sections={orderedSections}
              onDeviceChange={setPreviewDevice}
              onLocaleChange={setPreviewLocale}
            />
          </div>

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5">
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={sitePublished}
                onChange={(event) => setSitePublished(event.target.checked)}
              />
              {t("publishPage")}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {saveState && "error" in saveState ? (
                <p className="text-sm text-stamp">{saveState.error}</p>
              ) : null}
              {saveState && "saved" in saveState ? (
                <p className="text-sm text-forest">{t("editorSaved")}</p>
              ) : null}
              <a
                className="btn btn-ghost"
                href={`/s/${props.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("openPublicPage")}
              </a>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t("saving") : t("editorSavePublish")}
              </button>
            </div>
          </section>
        </form>
      ) : null}
    </div>
  );
}
