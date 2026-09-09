"use client";

import { useActionState } from "react";
import { completeOnboarding } from "@/app/actions/program";
import { useI18n } from "@/components/I18nProvider";

export function OnboardingForm() {
  const { t } = useI18n();
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
        {t("reward")}
        <input className="field mt-1" name="rewardLabel" required defaultValue="Free coffee" />
      </label>
      <label className="block text-sm font-semibold">
        {t("stampsNeeded")}
        <input className="field mt-1" name="stampsRequired" type="number" min={3} max={20} defaultValue={10} />
      </label>
      {state?.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
      <button className="btn btn-primary w-full" type="submit">
        {t("createShop")}
      </button>
    </form>
  );
}
