import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentMerchant } from "@/lib/merchant";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

export async function requireMerchant() {
  await requireUserId();
  const merchant = await getCurrentMerchant();
  if (!merchant) {
    redirect("/onboarding");
  }
  return merchant;
}
