import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { appUrl } from "@/lib/ids";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const png = await QRCode.toBuffer(`${appUrl()}/s/${slug}#loyalty`, {
    type: "png",
    margin: 1,
    width: 480,
  });
  return new NextResponse(Uint8Array.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
