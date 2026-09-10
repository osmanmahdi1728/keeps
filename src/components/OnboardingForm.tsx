"use client";

import { useActionState, useState } from "react";
import { completeOnboarding } from "@/app/actions/program";
import { useI18n } from "@/components/I18nProvider";
import {
  SITE_KIND_PROFILES,
  siteKindLabel,
  suggestProgram,
  type SiteKindId,
} from "@/lib/site-kinds";

export function OnboardingForm() {
  const { locale, t } = useI18n();
  const [siteKind, setSiteKind] = useState<SiteKindId>("cafe");
  const [rewardLabel, setRewardLabel] = useState("Free drink");
  const [stampsRequired, setStampsRequired] = useState(10);
  const [state, action] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => completeOnboarding(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold">
        {t("shopName")}
        <input className="field mt-1" name="name" required placeholder="Northside Coffee" />
      </label>
      <label className="block text-sm font-semibold">
        {t("businessType")}
        <select
          className="field mt-1"
          name="siteKind"
          value={siteKind}
          onChange={(event) => {
            const kind = event.target.value as SiteKindId;
            const suggestion = suggestProgram(kind);
            setSiteKind(kind);
            setRewardLabel(suggestion.rewardLabel);
            setStampsRequired(suggestion.stampsRequired);
          }}
        >
          {SITE_KIND_PROFILES.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {siteKindLabel(profile.id)[locale]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        {t("reward")}
        <input
          className="field mt-1"
          name="rewardLabel"
          required
          value={rewardLabel}
          onChange={(event) => setRewardLabel(event.target.value)}
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
          onChange={(event) => setStampsRequired(Number(event.target.value))}
        />
      </label>
      {state?.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
      <button className="btn btn-primary w-full" type="submit">
        {t("createShop")}
      </button>
    </form>
  );
}
