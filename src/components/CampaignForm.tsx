"use client";

import { useActionState } from "react";
import { sendCampaign } from "@/app/actions/campaigns";

type State = { error: string } | { sent: number } | undefined;

export function CampaignForm({ optedInCount }: { optedInCount: number }) {
  const [state, action] = useActionState(async (_prev: State, formData: FormData) => sendCampaign(formData), undefined);

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-semibold">
        Channel
        <select className="field mt-1" name="channel" defaultValue="wallet">
          <option value="wallet">Wallet push (all cards)</option>
          <option value="email">Email (opted-in only, {optedInCount})</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Subject (email only)
        <input className="field mt-1" name="subject" maxLength={120} />
      </label>
      <label className="block text-sm font-semibold">
        Message
        <textarea
          className="field mt-1 min-h-32"
          name="body"
          required
          minLength={8}
          placeholder="20% off Saturday–Sunday, Sep 12–13. Show your card."
        />
      </label>
      <p className="text-sm text-muted">
        Include dates. Apple and Google Wallet do not show a reliable sent time.
      </p>
      {state && "error" in state ? <p className="text-sm text-stamp">{state.error}</p> : null}
      {state && "sent" in state ? <p className="text-sm text-forest">Sent to {state.sent} people.</p> : null}
      <button className="btn btn-primary" type="submit">
        Send campaign
      </button>
    </form>
  );
}
