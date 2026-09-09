import { prisma } from "@/lib/db";
import {
  assembleSiteData,
  type AssembledSiteData,
} from "@/lib/site-migrate";

export async function loadSiteBySlug(slug: string): Promise<{
  merchant: NonNullable<Awaited<ReturnType<typeof findSiteMerchant>>>;
  siteData: AssembledSiteData;
} | null> {
  const merchant = await findSiteMerchant(slug);
  if (!merchant) {
    return null;
  }

  return {
    merchant,
    siteData: assembleSiteData({
      merchant,
      sections: merchant.siteSections,
      menuItems: merchant.siteMenuItems,
    }),
  };
}

function findSiteMerchant(slug: string) {
  return prisma.merchant.findUnique({
    where: { slug },
    include: {
      program: true,
      siteSections: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
      siteMedia: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
      siteMenuItems: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
      placeSnapshot: true,
    },
  });
}
