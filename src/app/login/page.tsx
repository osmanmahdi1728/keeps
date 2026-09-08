import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/LoginForm";
import { isResendConfigured } from "@/lib/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <h1 className="font-serif mt-8 text-4xl">Merchant sign in</h1>
      <p className="mt-3 text-muted">Demo account after seed: owner@keeps.local / keeps-demo</p>
      <div className="mt-8">
        <LoginForm callbackUrl={params.callbackUrl ?? "/dashboard"} magicLinkEnabled={isResendConfigured()} />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        New business?{" "}
        <Link href="/signup" className="text-ink underline">
          Create a shop account
        </Link>
      </p>
    </div>
  );
}
