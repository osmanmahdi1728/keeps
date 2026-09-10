import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { passDownloadTokenMatches } from "@/lib/wallet/pass-download-token";

export async function authenticatePassDownload(
  request: Request,
  serial: string,
) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const pass = await prisma.pass.findUnique({
    where: { serial },
    include: {
      customer: {
        include: { program: { include: { merchant: true } } },
      },
    },
  });

  if (!pass || !passDownloadTokenMatches(pass.authenticationToken, token)) {
    return {
      error: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  return { pass };
}
