export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug.length > 0 ? slug : "shop";
}

export function createSerial(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `k${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function createToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
