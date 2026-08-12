import Link from "next/link";

export default function FeaturesPage() {
  return (
    <MarketingShell title="Features">
      <ul className="space-y-4 text-muted">
        <li>Multi-payer expenses with validated totals</li>
        <li>Equal, exact, percentage, shares, and custom splits</li>
        <li>Group default split configuration</li>
        <li>Role-based member permissions</li>
        <li>Transfers as real settlements</li>
        <li>Offline-first Expo app with sync queue</li>
      </ul>
    </MarketingShell>
  );
}

function MarketingShell({ title, children }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-semibold text-primary">
          Nsplit
        </Link>
        <Link href="/signup" className="text-sm text-muted hover:text-foreground">
          Sign up
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
