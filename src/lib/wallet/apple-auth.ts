import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function authenticateApplePass(request: Request, serial: string) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("ApplePass ") ? header.slice("ApplePass ".length) : "";
  const pass = await prisma.pass.findUnique({
    where: { serial },
    include: {
      customer: { include: { program: { include: { merchant: true } } } },
      appleRegistrations: true,
    },
  });

  if (!pass || pass.authenticationToken !== token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { pass };
}
