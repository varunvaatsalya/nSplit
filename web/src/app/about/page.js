import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-semibold text-primary">
          Nsplit
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight">About</h1>
        <p className="mt-4 text-muted">
          Nsplit is a calm, modern expense-splitting product for groups that need
          more flexibility than classic split apps — without the clutter.
        </p>
      </main>
    </div>
  );
}
