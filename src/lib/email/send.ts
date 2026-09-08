import { Resend } from "resend";
import { appUrl } from "@/lib/ids";
import { isResendConfigured } from "@/lib/config";

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

export function emailLayout(merchantName: string, bodyHtml: string, unsubscribeUrl?: string): string {
  const footer = unsubscribeUrl
    ? `<p style="margin-top:32px;font-size:12px;color:#6b645b">You received this because you joined ${escapeHtml(merchantName)} on Keeps. <a href="${unsubscribeUrl}">Unsubscribe</a></p>`
    : `<p style="margin-top:32px;font-size:12px;color:#6b645b">Sent by ${escapeHtml(merchantName)} via Keeps.</p>`;

  return `<!DOCTYPE html>
<html>
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
): string {
  const offer = hasNewsletterOffer
    ? `<p style="padding:14px;background:#f4efe6;font-weight:bold">Welcome offer: 15% off your next visit. Show your card at the counter.</p>`
    : "";
  return emailLayout(
    merchantName,
    `<h1 style="font-size:28px;margin:0 0 12px">Your card is ready</h1>
     <p style="line-height:1.6">Keep this link on your phone and show the code at the counter. No app store download.</p>
     ${offer}
     <p><a href="${escapeHtml(cardUrl)}" style="color:#c45c26">Open your stamp card</a></p>`,
  );
}

export function rewardReadyEmailHtml(merchantName: string, rewardLabel: string): string {
  return emailLayout(
    merchantName,
    `<h1 style="font-size:28px;margin:0 0 12px">Reward ready</h1>
     <p style="line-height:1.6">Your ${escapeHtml(merchantName)} card is full. Show it at the counter for ${escapeHtml(rewardLabel)}.</p>`,
  );
}

export function campaignEmailHtml(
  merchantName: string,
  body: string,
  unsubscribeToken: string,
): string {
  const unsubscribeUrl = `${appUrl()}/unsubscribe/${unsubscribeToken}`;
  const paragraphs = escapeHtml(body)
    .split(/\n+/)
    .map((p) => `<p style="line-height:1.6">${p}</p>`)
    .join("");
  return emailLayout(
    merchantName,
    `<h1 style="font-size:28px;margin:0 0 12px">${escapeHtml(merchantName)}</h1>${paragraphs}`,
    unsubscribeUrl,
  );
}

export function magicLinkEmailHtml(url: string): string {
  return emailLayout(
    "Keeps",
    `<h1 style="font-size:28px;margin:0 0 12px">Sign in to Keeps</h1>
     <p style="line-height:1.6">Use this link to open your merchant dashboard. It expires soon.</p>
     <p><a href="${url}" style="color:#c45c26">Open dashboard</a></p>`,
  );
}
