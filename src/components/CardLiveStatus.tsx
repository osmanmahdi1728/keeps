"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function CardLiveStatus({
  rewardReady,
  rewardLabel,
}: {
  rewardReady: boolean;
  rewardLabel: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    const interval = window.setInterval(refresh, 3000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  useEffect(() => {
    if (rewardReady && "vibrate" in navigator) {
      navigator.vibrate([120, 60, 180]);
    }
  }, [rewardReady]);

  if (!rewardReady) {
    return (
      <p className="sr-only" aria-live="polite">
        Card progress updates automatically.
      </p>
    );
  }

  return (
    <section
      className="reward-celebration relative mt-6 w-full overflow-hidden rounded-3xl bg-forest px-6 py-8 text-center text-paper"
      aria-live="assertive"
    >
      <div className="reward-stars" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index}>★</span>
        ))}
      </div>
      <p className="relative text-xs font-semibold tracking-[0.22em] uppercase">
        Reward unlocked
      </p>
      <h2 className="font-serif relative mt-2 text-4xl">{rewardLabel}</h2>
      <p className="relative mt-3 text-sm text-paper/80">
        Show this screen at the counter. Staff will redeem it and your next
        card starts automatically.
      </p>
    </section>
  );
}
