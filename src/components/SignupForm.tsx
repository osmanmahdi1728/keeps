"use client";

import { useActionState } from "react";
import { registerMerchant } from "@/app/actions/auth";

export function SignupForm() {
  const [state, action, pending] = useActionState(
    async (_previous: { error: string } | undefined, formData: FormData) =>
      registerMerchant(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Your name
          <input
            className="field mt-1"
            name="ownerName"
            required
            maxLength={80}
            autoComplete="name"
          />
        </label>
        <label className="block text-sm font-semibold">
          Shop name
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
        Business email
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
          Password
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
          Confirm password
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
          Loyalty reward
          <input
            className="field mt-1"
            name="rewardLabel"
            required
            defaultValue="15% off"
            maxLength={80}
          />
        </label>
        <label className="block text-sm font-semibold">
          Stamps needed
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
        {pending ? "Creating your shop…" : "Create shop account"}
      </button>
      <p className="text-xs leading-5 text-muted">
        This creates a local test account. Email verification and billing are
        added when the app is deployed.
      </p>
    </form>
  );
}
