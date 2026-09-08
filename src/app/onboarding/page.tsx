import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentMerchant } from "@/lib/merchant";
import { OnboardingForm } from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const merchant = await getCurrentMerchant();
  if (merchant) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <h1 className="font-serif mt-8 text-4xl">Your first stamp card</h1>
      <p className="mt-3 text-muted">Name the shop, pick a reward, and you can start enrolling customers in a minute.</p>
      <div className="mt-8">
        <OnboardingForm />
      </div>
    </div>
  );
}
