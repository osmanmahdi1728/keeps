"use client";

import { useActionState } from "react";
import { sendCampaign } from "@/app/actions/campaigns";
import { useI18n } from "@/components/I18nProvider";

type State = { error: string } | { sent: number } | undefined;

export function CampaignForm({ optedInCount }: { optedInCount: number }) {
  const { t } = useI18n();
  const [state, action] = useActionState(async (_prev: State, formData: FormData) => sendCampaign(formData), undefined);

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold">
        {t("channel")}
        <select className="field mt-1" name="channel" defaultValue="wallet">
          <option value="wallet">{t("walletAllCards")}</option>
          <option value="email">{t("emailOptedIn", { count: optedInCount })}</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        {t("subjectEmailOnly")}
        <input className="field mt-1" name="subject" maxLength={120} />
      </label>
      <label className="block text-sm font-semibold">
        {t("message")}
        <textarea
          className="field mt-1 min-h-32"
          name="body"
          required
          minLength={8}
          placeholder="20% off Saturday–Sunday, Sep 12–13. Show your card."
        />
      </label>
      <p className="text-sm text-muted">
        {t("campaignDateHelp")}
      </p>
      {state && "error" in state ? <p className="text-sm text-stamp">{state.error}</p> : null}
      {state && "sent" in state ? <p className="text-sm text-forest">{t("sentPeople", { count: state.sent })}</p> : null}
      <button className="btn btn-primary" type="submit">
        {t("sendCampaign")}
      </button>
    </form>
  );
}
