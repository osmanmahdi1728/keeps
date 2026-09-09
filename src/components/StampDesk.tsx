"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  applyStampAction,
  lookupPass,
  redeemNewsletterOfferAction,
  redeemPassAction,
} from "@/app/actions/stamp";
import { useI18n } from "@/components/I18nProvider";
import type { StampCard } from "@/lib/types";

export function StampDesk() {
  const { t } = useI18n();
  const [card, setCard] = useState<StampCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const scannerRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !scannerRef.current) {
      return;
    }
    started.current = true;

    const scanner = new Html5Qrcode(scannerRef.current.id);
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (text) => {
          const data = new FormData();
          data.set("query", text);
          start(async () => {
            const result = await lookupPass(data);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            setError(null);
            setCard(result);
          });
        },
        () => undefined,
      )
      .catch(() => {
        setError(t("cameraUnavailable"));
      });

    return () => {
      void scanner.stop();
    };
  }, [t]);

  function runLookup(formData: FormData) {
    start(async () => {
      const result = await lookupPass(formData);
      if ("error" in result) {
        setError(result.error);
        setCard(null);
        return;
      }
      setError(null);
      setCard(result);
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
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setCard(result);
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
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setCard(result);
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <div id="keeps-scanner" ref={scannerRef} className="overflow-hidden rounded-2xl bg-ink" />
        <form className="mt-4 flex gap-2" action={runLookup}>
          <input className="field" name="query" placeholder={t("emailOrSerial")} />
          <button className="btn btn-primary" type="submit">
            {t("find")}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-stamp">{error}</p> : null}
      </div>
      <aside className="rounded-2xl border border-line bg-card p-5">
        {card ? (
          <>
            <p className="text-xs tracking-[0.18em] uppercase text-muted">{t("atCounter")}</p>
            <h2 className="font-serif mt-2 text-3xl">{card.name}</h2>
            <p className="text-sm text-muted">{card.email}</p>
            <p className="mt-4 font-serif text-5xl">
              {card.stampCount}
              <span className="text-2xl text-muted">/{card.stampsRequired}</span>
            </p>
            <p className="mt-2 text-sm">{t("reward")}: {card.rewardLabel}</p>
            {card.stampCount >= card.stampsRequired ? (
              <div className="mt-4 rounded-xl bg-forest p-3 text-paper">
                <p className="font-serif text-xl">{t("rewardUnlocked")}</p>
                <p className="mt-1 text-sm text-paper/80">
                  {t("rewardCounterHelp")}
                </p>
              </div>
            ) : null}
            {card.hasNewsletterOffer ? (
              <div className="mt-4 rounded-xl border border-stamp bg-paper p-3">
                <p className="font-semibold text-stamp">{t("welcomeAvailable")}</p>
                <button
                  className="btn btn-ghost mt-3 w-full"
                  type="button"
                  disabled={pending}
                  onClick={redeemNewsletterOffer}
                >
                  {t("markOfferUsed")}
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
                {t("addStamp")}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={pending || card.stampCount < card.stampsRequired}
                onClick={() => mutate("redeem")}
              >
                {t("redeemReward")}
              </button>
            </div>
          </>
        ) : (
          <p className="text-muted">{t("scanPrompt")}</p>
        )}
      </aside>
    </div>
  );
}
