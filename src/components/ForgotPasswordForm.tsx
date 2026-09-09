"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { useI18n } from "@/components/I18nProvider";

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    async (_previous: { error: string } | undefined, formData: FormData) =>
      requestPasswordReset(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-semibold">
        {t("email")}
        <input
          className="field mt-1"
          type="email"
          name="email"
          required
          maxLength={120}
          autoComplete="email"
        />
      </label>
      {state?.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {t("sendResetLink")}
      </button>
    </form>
  );
}
