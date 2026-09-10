"use client";

import { useState, useTransition } from "react";
import {
  importBusiness,
  searchBusinesses,
  type BusinessImportResult,
} from "@/app/actions/business-import";
import { useI18n } from "@/components/I18nProvider";
import type { PlaceSearchResult } from "@/lib/google-places";

export function BusinessImporter({
  googleReady,
  onImported,
}: {
  googleReady: boolean;
  onImported: (result: BusinessImportResult) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function search() {
    setError("");
    startTransition(async () => {
      const response = await searchBusinesses(query);
      if ("error" in response) {
        setError(response.error);
        return;
      }
      setResults(response.results);
      if (response.results.length === 0) {
        setError(t("editorImportNoResults"));
      }
    });
  }

  function importPlace(placeId: string) {
    setError("");
    startTransition(async () => {
      const response = await importBusiness({
        source: "google",
        placeId,
        instagram,
      });
      if ("error" in response) {
        setError(response.error);
        return;
      }
      onImported(response);
    });
  }

  function importWebsite() {
    setError("");
    startTransition(async () => {
      const response = await importBusiness({
        source: "website",
        websiteUrl,
        instagram,
      });
      if ("error" in response) {
        setError(response.error);
        return;
      }
      onImported(response);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="font-semibold">{t("editorImportGoogleTitle")}</p>
        <p className="mt-1 text-sm text-muted">{t("editorImportGoogleHelp")}</p>
        <div className="mt-4 flex gap-2">
          <input
            className="field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("editorImportPlaceholder")}
            disabled={!googleReady || pending}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={search}
            disabled={!googleReady || pending || query.trim().length < 3}
          >
            {t("editorSearch")}
          </button>
        </div>
        {!googleReady ? (
          <p className="mt-2 text-xs text-muted">{t("editorGoogleNotConfigured")}</p>
        ) : null}
        {results.length > 0 ? (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {results.map((place) => (
              <li
                key={place.id}
                className="flex items-center justify-between gap-4 p-3"
              >
                <span>
                  <strong className="block text-sm">{place.name}</strong>
                  <span className="block text-xs text-muted">{place.address}</span>
                </span>
                <button
                  type="button"
                  className="rounded-full border border-line px-3 py-1 text-xs font-semibold"
                  onClick={() => importPlace(place.id)}
                  disabled={pending}
                >
                  {t("editorUseBusiness")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="font-semibold">{t("editorImportWebsiteTitle")}</p>
        <p className="mt-1 text-sm text-muted">{t("editorImportWebsiteHelp")}</p>
        <input
          className="field mt-4"
          type="url"
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          placeholder="https://business.example"
          disabled={pending}
        />
        <button
          type="button"
          className="btn btn-ghost mt-3 w-full"
          onClick={importWebsite}
          disabled={pending || !websiteUrl}
        >
          {t("editorAnalyzeWebsite")}
        </button>
      </div>

      <label className="block text-sm font-semibold">
        {t("editorInstagramOptional")}
        <input
          className="field mt-1"
          value={instagram}
          onChange={(event) => setInstagram(event.target.value)}
          placeholder="@business"
          disabled={pending}
        />
        <span className="mt-1 block text-xs font-normal text-muted">
          {t("editorInstagramNoScrape")}
        </span>
      </label>

      {pending ? <p className="text-sm text-muted">{t("editorImporting")}</p> : null}
      {error ? <p className="text-sm text-stamp">{error}</p> : null}
      <p className="text-[11px] text-muted">{t("editorGoogleAttribution")}</p>
    </div>
  );
}
