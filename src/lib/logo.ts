import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export async function saveMerchantLogo(merchantId: string, file: File): Promise<string> {
  const ext = allowedTypes.get(file.type);
  if (!ext) {
    throw new Error("Use a PNG, JPG, or WebP logo.");
  }
  if (file.size > 800_000) {
    throw new Error("Keep the logo under 800 KB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${merchantId}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);
  return `/uploads/${filename}?v=${Date.now()}`;
}
