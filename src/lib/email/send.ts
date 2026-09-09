import { Resend } from "resend";
import { appUrl } from "@/lib/ids";
import { isResendConfigured } from "@/lib/config";
import { translate, type Locale } from "@/lib/i18n";

const fromAddress =
  process.env.EMAIL_FROM || "Keeps <noreply@localhost>";

function getResend(): Resend | null {
  if (!isResendConfigured() || !process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ demo: boolean }> {
  const resend = getResend();
  if (!resend) {
    console.info("[keeps email demo]", options.subject);
    return { demo: true };
  }

  const result = await resend.emails.send({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { demo: false };
}

export function emailLayout(
  merchantName: string,
  bodyHtml: string,
  locale: Locale = "en",
  unsubscribeUrl?: string,
): string {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) =>
    translate(locale, key, values);
  const footer = unsubscribeUrl
    ? `<p style="margin-top:32px;font-size:12px;color:#6b645b">${escapeHtml(t("emailUnsubscribe", { shop: merchantName }))}: <a href="${unsubscribeUrl}">${locale === "fr" ? "Se désabonner" : "Unsubscribe"}</a></p>`
    : `<p style="margin-top:32px;font-size:12px;color:#6b645b">${escapeHtml(t("emailSentBy", { shop: merchantName }))}</p>`;

  return `<!DOCTYPE html>
<html lang="${locale}">
  <body style="margin:0;background:#f4efe6;font-family:Georgia,serif;color:#1c1914">
    <div style="max-width:520px;margin:24px auto;background:#fffdf8;padding:32px;border:1px solid #e6ddd0">
      <p style="letter-spacing:0.16em;text-transform:uppercase;font-size:11px;color:#c45c26;margin:0 0 16px">Keeps</p>
      ${bodyHtml}
      ${footer}
    </div>
  </body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function welcomeEmailHtml(
  merchantName: string,
  cardUrl: string,
  hasNewsletterOffer: boolean,
  locale: Locale = "en",
): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const offer = hasNewsletterOffer
    ? `<p style="padding:14px;background:#f4efe6;font-weight:bold">${t("welcomeEmailOffer")}</p>`
    : "";
  return emailLayout(
    merchantName,
    `<h1 style="font-size:28px;margin:0 0 12px">${t("welcomeEmailTitle")}</h1>
     <p style="line-height:1.6">${t("welcomeEmailBody")}</p>
     ${offer}
     <p><a href="${escapeHtml(cardUrl)}" style="color:#c45c26">${t("openStampCard")}</a></p>`,
    locale,
  );
}

export function rewardReadyEmailHtml(merchantName: string, rewardLabel: string, locale: Locale = "en"): string {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string>) =>
    translate(locale, key, values);
  return emailLayout(
    merchantName,
    `<h1 style="font-size:28px;margin:0 0 12px">${t("rewardEmailTitle")}</h1>
     <p style="line-height:1.6">${escapeHtml(t("rewardEmailBody", { shop: merchantName, reward: rewardLabel }))}</p>`,
    locale,
  );
}

export function campaignEmailHtml(
  merchantName: string,
  body: string,
  unsubscribeToken: string,
  locale: Locale = "en",
): string {
  const unsubscribeUrl = `${appUrl()}/unsubscribe/${unsubscribeToken}`;
  const paragraphs = escapeHtml(body)
    .split(/\n+/)
    .map((p) => `<p style="line-height:1.6">${p}</p>`)
    .join("");
  return emailLayout(
    merchantName,
    `<h1 style="font-size:28px;margin:0 0 12px">${escapeHtml(merchantName)}</h1>${paragraphs}`,
    locale,
    unsubscribeUrl,
  );
}

export function magicLinkEmailHtml(url: string, locale: Locale = "en"): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return emailLayout(
    "Keeps",
    `<h1 style="font-size:28px;margin:0 0 12px">${t("magicEmailTitle")}</h1>
     <p style="line-height:1.6">${t("magicEmailBody")}</p>
     <p><a href="${url}" style="color:#c45c26">${t("openDashboard")}</a></p>`,
    locale,
  );
}

export function passwordResetEmailHtml(url: string, locale: Locale = "en"): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return emailLayout(
    "Keeps",
    `<h1 style="font-size:28px;margin:0 0 12px">${t("resetEmailTitle")}</h1>
     <p style="line-height:1.6">${t("resetEmailBody")}</p>
     <p><a href="${escapeHtml(url)}" style="color:#c45c26">${t("resetEmailAction")}</a></p>`,
    locale,
  );
}
