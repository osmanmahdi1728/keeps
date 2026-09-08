import type { ReactNode } from "react";
import { MerchantNav } from "@/components/MerchantNav";
import { requireMerchant } from "@/lib/guards";

export default async function MerchantLayout({ children }: { children: ReactNode }) {
  const merchant = await requireMerchant();
  return (
    <div className="min-h-full">
      <MerchantNav shopName={merchant.name} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
