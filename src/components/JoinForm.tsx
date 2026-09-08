"use client";

import { useActionState } from "react";
import { joinProgram } from "@/app/actions/join";

export function JoinForm({ slug, shopName }: { slug: string; shopName: string }) {
  const [state, action] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => joinProgram(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <label className="block text-sm font-semibold">
        Name
        <input className="field mt-1" name="name" required maxLength={80} />
      </label>
      <label className="block text-sm font-semibold">
        Email
        <input className="field mt-1" type="email" name="email" required />
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketingOptIn" className="mt-1" />
        <span>
          <strong className="text-ink">Get 15% off your next visit.</strong> Subscribe to occasional offers from {shopName}.
          You can unsubscribe any time.
        </span>
      </label>
      {state?.error ? <p className="text-sm text-stamp">{state.error}</p> : null}
      <button className="btn btn-primary w-full" type="submit">
        Get my card
      </button>
    </form>
  );
}
