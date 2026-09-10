"use client";

import { useActionState, useState } from "react";
import { sendCampaign } from "@/app/actions/campaigns";
import { useI18n } from "@/components/I18nProvider";
import type { CampaignChannel } from "@/lib/types";

type State = { error: string } | { sent: number } | undefined;

export function CampaignForm({
  walletCount,
  optedInCount,
  walletReady,
  emailReady,
}: {
  walletCount: number;
  optedInCount: number;
  walletReady: boolean;
  emailReady: boolean;
}) {
  const { t } = useI18n();
  const [channel, setChannel] = useState<CampaignChannel>("wallet");
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => sendCampaign(formData),
    undefined,
  );
  const channelReady = channel === "wallet" ? walletReady : emailReady;
  const audience = channel === "wallet" ? walletCount : optedInCount;

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold">
        {t("channel")}
        <select
          className="field mt-1"
          name="channel"
          value={channel}
          onChange={(event) => setChannel(event.target.value as CampaignChannel)}
        >
          <option value="wallet">{t("walletAllCards")} ({walletCount})</option>
          <option value="email">{t("emailOptedIn", { count: optedInCount })}</option>
        </select>
      </label>
      {channel === "email" ? (
        <label className="block text-sm font-semibold">
          {t("subjectEmailOnly")}
          <input className="field mt-1" name="subject" maxLength={120} required />
        </label>
      ) : null}
      <label className="block text-sm font-semibold">
        {t("message")}
        <textarea
          className="field mt-1 min-h-32"
          name="body"
          required
          minLength={8}
          maxLength={180}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="20% off Saturday–Sunday, Sep 12–13. Show your card."
        />
      </label>
      <div className="flex justify-between gap-4 text-sm text-muted">
        <p>{t("campaignAudience", { count: audience })}</p>
        <p>{body.length}/180</p>
      </div>
      {!channelReady ? (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-muted">
          {channel === "wallet"
            ? t("walletCampaignUnavailable")
            : t("emailCampaignUnavailable")}
        </p>
      ) : null}
      {body ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("messagePreview")}
          </p>
          <p className="mt-2 text-sm">{body}</p>
        </div>
      ) : null}
      {state && "error" in state ? <p className="text-sm text-stamp">{state.error}</p> : null}
      {state && "sent" in state ? <p className="text-sm text-forest">{t("sentPeople", { count: state.sent })}</p> : null}
      <button
        className="btn btn-primary"
        type="submit"
        disabled={pending || !channelReady || audience === 0}
      >
        {pending ? t("sending") : t("sendCampaign")}
      </button>
    </form>
  );
}
