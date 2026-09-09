"use client";

import { useActionState } from "react";
import { registerMerchant } from "@/app/actions/auth";
import { useI18n } from "@/components/I18nProvider";

export function SignupForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    async (_previous: { error: string } | undefined, formData: FormData) =>
      registerMerchant(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t("ownerName")}
          <input
            className="field mt-1"
            name="ownerName"
            required
            maxLength={80}
            autoComplete="name"
          />
        </label>
        <label className="block text-sm font-semibold">
          {t("shopName")}
          <input
            className="field mt-1"
            name="shopName"
            required
            maxLength={80}
            autoComplete="organization"
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        {t("businessEmail")}
        <input
          className="field mt-1"
          type="email"
          name="email"
          required
          maxLength={120}
          autoComplete="email"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t("password")}
          <input
            className="field mt-1"
            type="password"
            name="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
        </label>
        <label className="block text-sm font-semibold">
          {t("confirmPassword")}
          <input
            className="field mt-1"
            type="password"
            name="confirmPassword"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t("loyaltyReward")}
          <input
            className="field mt-1"
            name="rewardLabel"
            required
            defaultValue="15% off"
            maxLength={80}
          />
        </label>
        <label className="block text-sm font-semibold">
          {t("stampsNeeded")}
          <input
            className="field mt-1"
            type="number"
            name="stampsRequired"
            required
            min={3}
            max={20}
            defaultValue={10}
          />
        </label>
      </div>
      {state?.error ? (
        <p className="text-sm text-stamp" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? t("creatingShop") : t("createShopAccount")}
      </button>
      <p className="text-xs leading-5 text-muted">
        This creates a local test account. Email verification and billing are
        added when the app is deployed.
      </p>
    </form>
  );
}
