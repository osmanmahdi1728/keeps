"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  applyStampAction,
  lookupPass,
  redeemNewsletterOfferAction,
  redeemPassAction,
} from "@/app/actions/stamp";

type CardState = {
  serial: string;
  name: string;
  email: string;
  stampCount: number;
  stampsRequired: number;
  rewardLabel: string;
  hasNewsletterOffer: boolean;
};

export function StampDesk() {
  const [card, setCard] = useState<CardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const scannerRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !scannerRef.current) {
      return;
    }
    started.current = true;
    let stop: (() => Promise<void>) | undefined;

    void import("html5-qrcode").then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode(scannerRef.current!.id);
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (text) => {
            const data = new FormData();
            data.set("query", text);
            start(async () => {
              const result = await lookupPass(data);
              if ("error" in result && result.error) {
                setError(result.error);
                return;
              }
              if ("serial" in result) {
                setError(null);
                setCard(result);
              }
            });
          },
          () => undefined,
        )
        .catch(() => {
          setError("Camera unavailable. Type the customer email instead.");
        });
      stop = () => scanner.stop();
    });

    return () => {
      void stop?.();
    };
  }, []);

  function runLookup(formData: FormData) {
    start(async () => {
      const result = await lookupPass(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        setCard(null);
        return;
      }
      if ("serial" in result) {
        setError(null);
        setCard(result);
      }
    });
  }

  function mutate(kind: "stamp" | "redeem") {
    if (!card) {
      return;
    }
    const data = new FormData();
    data.set("serial", card.serial);
    start(async () => {
      const result = kind === "stamp" ? await applyStampAction(data) : await redeemPassAction(data);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("serial" in result) {
        setError(null);
        setCard(result);
      }
    });
  }

  function redeemNewsletterOffer() {
    if (!card) {
      return;
    }
    const data = new FormData();
    data.set("serial", card.serial);
    start(async () => {
      const result = await redeemNewsletterOfferAction(data);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("serial" in result) {
        setError(null);
        setCard(result);
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <div id="keeps-scanner" ref={scannerRef} className="overflow-hidden rounded-2xl bg-ink" />
        <form className="mt-4 flex gap-2" action={runLookup}>
          <input className="field" name="query" placeholder="Email or serial" />
          <button className="btn btn-primary" type="submit">
            Find
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-stamp">{error}</p> : null}
      </div>
      <aside className="rounded-2xl border border-line bg-card p-5">
        {card ? (
          <>
            <p className="text-xs tracking-[0.18em] uppercase text-muted">At the counter</p>
            <h2 className="font-serif mt-2 text-3xl">{card.name}</h2>
            <p className="text-sm text-muted">{card.email}</p>
            <p className="mt-4 font-serif text-5xl">
              {card.stampCount}
              <span className="text-2xl text-muted">/{card.stampsRequired}</span>
            </p>
            <p className="mt-2 text-sm">Reward: {card.rewardLabel}</p>
            {card.stampCount >= card.stampsRequired ? (
              <div className="mt-4 rounded-xl bg-forest p-3 text-paper">
                <p className="font-serif text-xl">Reward unlocked</p>
                <p className="mt-1 text-sm text-paper/80">
                  The customer’s phone updates automatically. Give the reward,
                  then tap Redeem.
                </p>
              </div>
            ) : null}
            {card.hasNewsletterOffer ? (
              <div className="mt-4 rounded-xl border border-stamp bg-paper p-3">
                <p className="font-semibold text-stamp">15% welcome offer available</p>
                <button
                  className="btn btn-ghost mt-3 w-full"
                  type="button"
                  disabled={pending}
                  onClick={redeemNewsletterOffer}
                >
                  Mark 15% offer used
                </button>
              </div>
            ) : null}
            <div className="mt-6 flex flex-col gap-2">
              <button
                className="btn btn-accent"
                type="button"
                disabled={pending || card.stampCount >= card.stampsRequired}
                onClick={() => mutate("stamp")}
              >
                Add stamp
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={pending || card.stampCount < card.stampsRequired}
                onClick={() => mutate("redeem")}
              >
                Redeem reward
              </button>
            </div>
          </>
        ) : (
          <p className="text-muted">Scan a wallet card or look up an email to stamp.</p>
        )}
      </aside>
    </div>
  );
}
