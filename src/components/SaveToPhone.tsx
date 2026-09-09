"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function SaveToPhone({ cardUrl, shopName }: { cardUrl: string; shopName: string }) {
  const { t } = useI18n();
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
          {t("addHome")}
        </button>
      ) : (
        <button className="btn btn-primary w-full" type="button" onClick={() => void share()}>
          {t("saveShare")}
        </button>
      )}
      <button className="btn btn-ghost w-full" type="button" onClick={() => void copyLink()}>
        {copied ? t("copied") : t("copyLink")}
      </button>
      <ol className="space-y-2 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted">
        <li>
          <strong className="text-ink">iPhone:</strong> {t("iphoneHelp")}
        </li>
        <li>
          <strong className="text-ink">Android:</strong> {t("androidHelp")}
        </li>
      </ol>
    </div>
  );
}
