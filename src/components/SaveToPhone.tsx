"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function SaveToPhone({ cardUrl, shopName }: { cardUrl: string; shopName: string }) {
  const [copied, setCopied] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({
        title: `${shopName} stamp card`,
        url: cardUrl,
      });
      return;
    }
    await copyLink();
  }

  async function install() {
    if (!installEvent) {
      return;
    }
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <div className="w-full space-y-3 text-left">
      {installEvent ? (
        <button className="btn btn-primary w-full" type="button" onClick={() => void install()}>
          Add to home screen
        </button>
      ) : (
        <button className="btn btn-primary w-full" type="button" onClick={() => void share()}>
          Save / share this card
        </button>
      )}
      <button className="btn btn-ghost w-full" type="button" onClick={() => void copyLink()}>
        {copied ? "Link copied" : "Copy card link"}
      </button>
      <ol className="space-y-2 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted">
        <li>
          <strong className="text-ink">iPhone:</strong> tap Share, then Add to Home Screen. Open that icon at the register.
        </li>
        <li>
          <strong className="text-ink">Android:</strong> tap the browser menu, then Add to Home screen / Install app.
        </li>
      </ol>
    </div>
  );
}
