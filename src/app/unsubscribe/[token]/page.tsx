import { unsubscribeByToken } from "@/app/actions/campaigns";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await unsubscribeByToken(token);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-serif text-4xl">You are unsubscribed</h1>
      <p className="mt-3 text-muted">You will not receive marketing email from this shop. Your stamp card still works.</p>
    </div>
  );
}
