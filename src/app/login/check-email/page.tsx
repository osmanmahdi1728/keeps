import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <Link href="/" className="font-serif text-3xl">
        Keeps
      </Link>
      <h1 className="font-serif mt-8 text-4xl">Check your email</h1>
      <p className="mt-3 text-muted">If that address has a merchant account, we sent a sign-in link.</p>
    </div>
  );
}
