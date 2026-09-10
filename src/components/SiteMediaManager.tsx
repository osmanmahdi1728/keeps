"use client";

import { useRef, useState, useTransition } from "react";
import {
  deleteWebsiteImage,
  generateWebsiteImage,
  uploadWebsiteImage,
} from "@/app/actions/business-import";
import { useI18n } from "@/components/I18nProvider";
import type { SiteMedia } from "@/lib/site-sections";

export function SiteMediaManager({
  blobReady,
  aiReady,
  media,
  onUploaded,
  onDeleted,
}: {
  blobReady: boolean;
  aiReady: boolean;
  media: SiteMedia[];
  onUploaded: (media: SiteMedia) => void;
  onDeleted: (key: string) => void;
}) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState("");
  const [pending, startTransition] = useTransition();

  function upload(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const result = await uploadWebsiteImage(formData);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      onUploaded(result.media);
      formRef.current?.reset();
      setMessage(t("editorUploadComplete"));
    });
  }

  function generate() {
    setMessage("");
    startTransition(async () => {
      const result = await generateWebsiteImage(prompt);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      onUploaded(result.media);
      setMessage(t("editorAiImageComplete"));
    });
  }

  function remove(key: string) {
    setMessage("");
    startTransition(async () => {
      const result = await deleteWebsiteImage(key);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      onDeleted(key);
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h3 className="font-semibold">{t("editorGallery")}</h3>
      <p className="mt-1 text-sm text-muted">{t("editorGalleryHelp")}</p>
      {media.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media
            .filter((item): item is Extract<SiteMedia, { kind: "image" }> => item.kind === "image")
            .map((item) => (
              <figure key={item.key} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.alt.en}
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
                {item.metadata?.source === "google" ? (
                  <figcaption className="mt-1 text-[10px] text-muted">
                    {t("editorImportedPhoto")}
                    {item.metadata.attribution?.map((attribution) => (
                      <span key={`${item.key}-${attribution.name}`}>
                        {" · "}
                        {attribution.uri ? (
                          <a
                            className="underline"
                            href={attribution.uri}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {attribution.name}
                          </a>
                        ) : (
                          attribution.name
                        )}
                      </span>
                    ))}
                  </figcaption>
                ) : null}
                <button
                  type="button"
                  className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold"
                  onClick={() => remove(item.key)}
                  disabled={pending}
                >
                  {t("editorRemove")}
                </button>
              </figure>
            ))}
        </div>
      ) : null}
      <form ref={formRef} action={upload} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className="field sm:col-span-2"
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          required
          disabled={!blobReady || pending}
        />
        <input className="field" name="altEn" required placeholder={t("editorAltEnglish")} />
        <input className="field" name="altFr" required placeholder={t("editorAltFrench")} />
        <button
          type="submit"
          className="btn btn-ghost sm:col-span-2"
          disabled={!blobReady || pending}
        >
          {pending ? t("editorUploading") : t("editorUploadImage")}
        </button>
      </form>
      {!blobReady ? (
        <p className="mt-2 text-xs text-muted">{t("editorBlobNotConfigured")}</p>
      ) : null}
      {message ? <p className="mt-2 text-sm text-muted">{message}</p> : null}
      {media.length === 0 ? (
        <div className="mt-5 border-t border-line pt-5">
          <p className="text-sm font-semibold">{t("editorAiImageTitle")}</p>
          <p className="mt-1 text-xs text-muted">{t("editorAiImageHelp")}</p>
          <textarea
            className="field mt-3 min-h-20"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t("editorAiImagePlaceholder")}
            maxLength={500}
          />
          <button
            type="button"
            className="btn btn-ghost mt-3 w-full"
            onClick={generate}
            disabled={!blobReady || !aiReady || pending || prompt.trim().length < 10}
          >
            {pending ? t("editorGeneratingImage") : t("editorGenerateImage")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
