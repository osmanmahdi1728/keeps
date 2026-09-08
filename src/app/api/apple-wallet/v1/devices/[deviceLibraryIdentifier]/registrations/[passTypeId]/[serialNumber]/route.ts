import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApplePass } from "@/lib/wallet/apple-auth";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      deviceLibraryIdentifier: string;
      passTypeId: string;
      serialNumber: string;
    }>;
  },
) {
  const { deviceLibraryIdentifier, serialNumber } = await context.params;
  const auth = await authenticateApplePass(request, serialNumber);
  if ("error" in auth) {
    return auth.error;
  }

  const body = (await request.json()) as { pushToken?: string };
  if (!body.pushToken) {
    return NextResponse.json({ error: "Missing pushToken" }, { status: 400 });
  }

  await prisma.appleRegistration.upsert({
    where: {
      passId_deviceLibraryIdentifier: {
        passId: auth.pass.id,
        deviceLibraryIdentifier,
      },
    },
    update: { pushToken: body.pushToken },
    create: {
      passId: auth.pass.id,
      deviceLibraryIdentifier,
      pushToken: body.pushToken,
    },
  });

  return new NextResponse(null, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      deviceLibraryIdentifier: string;
      passTypeId: string;
      serialNumber: string;
    }>;
  },
) {
  const { deviceLibraryIdentifier, serialNumber } = await context.params;
  const auth = await authenticateApplePass(request, serialNumber);
  if ("error" in auth) {
    return auth.error;
  }

  await prisma.appleRegistration.deleteMany({
    where: { passId: auth.pass.id, deviceLibraryIdentifier },
  });

  return new NextResponse(null, { status: 200 });
}
