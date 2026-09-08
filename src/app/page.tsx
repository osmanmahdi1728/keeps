import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <p className="font-serif text-3xl">Keeps</p>
        <div className="flex gap-3">
          <Link href="/login" className="btn btn-ghost">
            Merchant login
          </Link>
          <Link href="/join/demo-cafe" className="btn btn-primary">
            Try a card
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-stamp">For the shops on your street</p>
            <h1 className="font-serif mt-4 max-w-xl text-6xl leading-[0.95]">
              Stamp cards that live next to the credit card.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-7 text-muted">
              No customer app and no store listing. They scan a QR, keep a stamp card on their phone, and you stamp at
              the counter. Apple Wallet and Google Wallet can come later.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-accent">
                Start a shop
              </Link>
              <Link href="/join/demo-cafe" className="btn btn-ghost">
                Join Demo Cafe
              </Link>
            </div>
          </div>
          <div className="rounded-[32px] bg-forest p-8 text-[#f3eadc] shadow-[0_30px_80px_rgba(28,25,20,0.25)]">
            <p className="text-xs tracking-[0.2em] uppercase opacity-70">Wallet preview</p>
            <p className="font-serif mt-6 text-4xl">Northside Coffee</p>
            <p className="mt-2 text-sm opacity-80">Free pour-over after 10 stamps</p>
            <div className="mt-8 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={`home-stamp-${i}`}
                  className="flex h-9 items-center justify-center rounded-full border border-[#f3eadc]/40 text-xs"
                  style={{ background: i < 4 ? "#c45c26" : "transparent" }}
                />
              ))}
            </div>
          </div>
        </section>
        <section className="grid gap-6 border-t border-line py-14 md:grid-cols-3">
          <Feature title="A card on the home screen" body="iPhone and Android keep the card like an app icon. No App Store. No Play Store." />
          <Feature title="Stamp at the counter" body="Staff scan the QR on the card. Progress updates the next time the customer opens it." />
          <Feature title="Email the regulars" body="Opt-in at join. Send a quiet-night offer with an unsubscribe link built in." />
        </section>
      </main>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-3 text-muted">{body}</p>
    </div>
  );
}
