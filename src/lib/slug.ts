import { prisma } from "@/lib/db";

export async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 2;
  while (await prisma.merchant.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}
