import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/ids";
import { customerEntryPath } from "@/lib/site";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const merchant = await prisma.merchant.findUnique({
    where: { slug },
    select: { sitePublished: true },
  });
  const png = await QRCode.toBuffer(
    `${appUrl()}${customerEntryPath(slug, merchant?.sitePublished ?? false)}`,
    {
      type: "png",
      margin: 1,
      width: 480,
    },
  );
  return new NextResponse(Uint8Array.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
