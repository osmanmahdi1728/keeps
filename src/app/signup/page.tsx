import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "@/components/SignupForm";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-12">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <p className="mt-8 text-xs font-semibold tracking-[0.2em] uppercase text-stamp">
        For business owners
      </p>
      <h1 className="font-serif mt-2 text-4xl">Create your shop</h1>
      <p className="mt-3 text-muted">
        Set up an account and receive a customer join link and QR immediately.
      </p>
      <div className="mt-8 rounded-2xl border border-line bg-card p-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
