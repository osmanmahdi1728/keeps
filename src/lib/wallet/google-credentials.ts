export type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

// Accepts either the raw key file or a base64 copy of it, because pasting the
// multi-line JSON into a hosting dashboard often mangles the newlines.
export function parseServiceAccount(
  raw: string | undefined | null,
): GoogleServiceAccount | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  const text = trimmed.startsWith("{") ? trimmed : decodeBase64(trimmed);
  if (!text) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const { client_email: clientEmail, private_key: privateKey } =
    parsed as Partial<GoogleServiceAccount>;
  if (typeof clientEmail !== "string" || typeof privateKey !== "string") {
    return null;
  }
  if (!clientEmail.includes("@") || !privateKey.includes("PRIVATE KEY")) {
    return null;
  }

  return {
    client_email: clientEmail,
    // Some dashboards store the escape sequence rather than a real newline.
    private_key: privateKey.replace(/\\n/g, "\n"),
  };
}

function decodeBase64(value: string): string | null {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return decoded.trimStart().startsWith("{") ? decoded : null;
  } catch {
    return null;
  }
}
