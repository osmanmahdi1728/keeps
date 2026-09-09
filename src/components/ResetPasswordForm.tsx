"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/actions/auth";
import { useI18n } from "@/components/I18nProvider";

export function ResetPasswordForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    async (_previous: { error: string } | undefined, formData: FormData) =>
      resetPassword(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm font-semibold">
        {t("newPassword")}
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
      {state?.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {t("saveNewPassword")}
      </button>
    </form>
  );
}
