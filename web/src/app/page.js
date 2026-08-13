import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-semibold tracking-tight text-primary">
          Nsplit
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-3.5 py-2 font-medium text-primary-foreground"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-16">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium text-primary">Nsplit</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Split group expenses without the friction.
          </h1>
          <p className="mt-4 text-lg text-muted">
            Multi-payer expenses, configurable defaults, clear transfers, and an
            offline-first mobile app - built for real shared money.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Get started
            </Link>
            <Link
              href="/features"
              className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium"
            >
              See features
            </Link>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Flexible splits",
              body: "Equal, exact, percentage, shares, or custom - with group defaults.",
            },
            {
              title: "Real transfers",
              body: "Settlements are transfers. Track money that actually moved.",
            },
            {
              title: "Offline mobile",
              body: "Create expenses without signal. Sync automatically later.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <h2 className="font-medium text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
