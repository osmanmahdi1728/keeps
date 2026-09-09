"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginWithEmail, loginWithPassword } from "@/app/actions/auth";
import { useI18n } from "@/components/I18nProvider";

const initial = undefined as { error: string } | undefined;

export function LoginForm({
  callbackUrl,
  magicLinkEnabled,
}: {
  callbackUrl: string;
  magicLinkEnabled: boolean;
}) {
  const { t } = useI18n();
  const [passwordState, passwordAction] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => loginWithPassword(formData),
    initial,
  );
  const [emailState, emailAction] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => loginWithEmail(formData),
    initial,
  );

  return (
    <div className="space-y-8">
      <form action={passwordAction} className="space-y-3">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className="block text-sm font-semibold">
          {t("email")}
          <input className="field mt-1" type="email" name="email" required autoComplete="email" />
        </label>
        <label className="block text-sm font-semibold">
          {t("password")}
          <input className="field mt-1" type="password" name="password" required autoComplete="current-password" />
        </label>
        {passwordState?.error ? <p className="text-sm text-stamp">{passwordState.error}</p> : null}
        <button className="btn btn-primary w-full" type="submit">
          {t("signIn")}
        </button>
        <p className="text-right text-sm">
          <Link href="/login/forgot" className="text-muted underline">
            {t("forgotPassword")}
          </Link>
        </p>
      </form>
      {magicLinkEnabled ? (
        <form action={emailAction} className="space-y-3 border-t border-line pt-6">
          <p className="text-sm text-muted">{t("magicLinkIntro")}</p>
          <input className="field" type="email" name="email" required placeholder="you@shop.com" />
          {emailState?.error ? <p className="text-sm text-stamp">{emailState.error}</p> : null}
          <button className="btn btn-ghost w-full" type="submit">
            {t("emailLink")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
