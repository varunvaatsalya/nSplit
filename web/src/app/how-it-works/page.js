import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-semibold text-primary">
          Nsplit
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-muted">
          <li>Create a group and invite or add members</li>
          <li>Add expenses, income, or transfers</li>
          <li>Nsplit calculates balances on the server</li>
          <li>Settle via transfers — no duplicate settlement system</li>
        </ol>
      </main>
    </div>
  );
}
