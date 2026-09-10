import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isExpectedApplePassType } from "@/lib/config";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ deviceLibraryIdentifier: string; passTypeId: string }>;
  },
) {
  const { deviceLibraryIdentifier, passTypeId } = await context.params;
  if (!isExpectedApplePassType(passTypeId)) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const since = url.searchParams.get("passesUpdatedSince");
  const sinceDate = since ? new Date(Number(since) * 1000) : new Date(0);

  const registrations = await prisma.appleRegistration.findMany({
    where: { deviceLibraryIdentifier },
    include: { pass: true },
  });

  const serialNumbers = registrations
    .filter((reg) => reg.pass.updatedAt >= sinceDate)
    .map((reg) => reg.pass.serial);

  return NextResponse.json({
    lastUpdated: String(Math.floor(Date.now() / 1000)),
    serialNumbers,
  });
}
