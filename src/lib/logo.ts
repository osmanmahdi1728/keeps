import { del, put } from "@vercel/blob";
import { Buffer } from "node:buffer";

const allowedTypes = new Map<string, { extension: string; signatures: number[][] }>([
  ["image/png", { extension: "png", signatures: [[0x89, 0x50, 0x4e, 0x47]] }],
  ["image/jpeg", { extension: "jpg", signatures: [[0xff, 0xd8, 0xff]] }],
  ["image/webp", { extension: "webp", signatures: [[0x52, 0x49, 0x46, 0x46]] }],
]);

function hasSignature(bytes: Uint8Array, signatures: number[][]): boolean {
  const startsCorrectly = signatures.some((signature) =>
    signature.every((byte, index) => bytes[index] === byte),
  );
  if (!startsCorrectly) {
    return false;
  }
  const riff = signatures.some((signature) => signature[0] === 0x52);
  return (
    !riff ||
    [0x57, 0x45, 0x42, 0x50].every((byte, index) => bytes[index + 8] === byte)
  );
}

export async function saveMerchantImage(
  merchantId: string,
  file: File,
  kind: "logo" | "gallery",
): Promise<string> {
  const imageType = allowedTypes.get(file.type);
  if (!imageType) {
    throw new Error("Use a PNG, JPG, or WebP logo.");
  }
  const maximum = kind === "logo" ? 800_000 : 4_000_000;
  if (file.size > maximum) {
    throw new Error(
      kind === "logo" ? "Keep the logo under 800 KB." : "Keep images under 4 MB.",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasSignature(bytes, imageType.signatures)) {
    throw new Error("The file contents do not match its image type.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Image storage is not configured.");
  }

  const blob = await put(
    `merchants/${merchantId}/${kind}.${imageType.extension}`,
    Buffer.from(bytes),
    {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    },
  );
  return blob.url;
}

export async function saveMerchantImageBytes(
  merchantId: string,
  bytes: Uint8Array,
  contentType: string,
  kind: "logo" | "gallery",
): Promise<string> {
  const imageType = allowedTypes.get(contentType);
  if (
    !imageType ||
    bytes.byteLength === 0 ||
    bytes.byteLength > 4_000_000 ||
    !hasSignature(bytes, imageType.signatures)
  ) {
    throw new Error("The imported image is not supported.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Image storage is not configured.");
  }
  const blob = await put(
    `merchants/${merchantId}/${kind}.${imageType.extension}`,
    Buffer.from(bytes),
    {
      access: "public",
      addRandomSuffix: true,
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    },
  );
  return blob.url;
}

export async function saveMerchantLogo(
  merchantId: string,
  file: File,
): Promise<string> {
  return saveMerchantImage(merchantId, file, "logo");
}

export async function deleteMerchantImage(url: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !url.includes(".public.blob.vercel-storage.com/")) {
    return;
  }
  await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
