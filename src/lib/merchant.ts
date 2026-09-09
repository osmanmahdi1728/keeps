import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const getCurrentMerchant = cache(async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  return prisma.merchant.findUnique({
    where: { userId },
    include: {
      program: true,
      siteSections: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
      siteMenuItems: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
  });
});
