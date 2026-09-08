import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/ids";

export async function GET(
  request: Request,
  context: { params: Promise<{ serial: string }> },
) {
  const { serial } = await context.params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const pass = await prisma.pass.findUnique({
    where: { serial },
    include: { customer: { include: { program: { include: { merchant: true } } } } },
  });

  if (!pass || token !== pass.authenticationToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const name = pass.customer.program.merchant.name;
  const startUrl = `${appUrl()}/card/${serial}?t=${encodeURIComponent(token)}`;

  return NextResponse.json(
    {
      name: `${name} stamp card`,
      short_name: name,
      start_url: startUrl,
      display: "standalone",
      background_color: merchantColor(pass.customer.program.merchant.backgroundColor),
      theme_color: pass.customer.program.merchant.primaryColor,
      icons: [{ src: "/keeps-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
      },
    },
  );
}

function merchantColor(value: string): string {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : "#f4efe6";
}
