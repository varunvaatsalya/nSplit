import Link from "next/link";
import { Cloud, Link2, Scale, WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const BENEFITS = [
  { icon: WifiOff, title: "Works offline", text: "Add bills on your phone anywhere. They sync when you're back online." },
  { icon: Link2, title: "One link for the group", text: "Friends see every expense and what they owe. No app or login needed." },
  { icon: Scale, title: "Always know who owes whom", text: "Balances update with every expense you add." },
  { icon: Cloud, title: "Phone and web, in sync", text: "Your groups follow you to every device." },
];

/**
 * Login / sign-up frame. Large screens get a brand panel with what nSplit does;
 * small screens get just the logo and the form.
 */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" />
        <Link href="/" className="relative flex items-center gap-2">
          <Logo className="h-7 w-7 text-primary-foreground" />
          <span className="text-2xl font-extrabold tracking-tight">nSplit</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">Split expenses.<br />Settle cleanly.</h2>
          <ul className="mt-8 space-y-5">
            {BENEFITS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="block text-sm opacity-80">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs opacity-70">Free for groups of any size.</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <Logo className="h-7 w-7 text-primary dark:text-primary-foreground" />
            <span className="text-2xl font-extrabold tracking-tight text-primary dark:text-primary-foreground">nSplit</span>
          </Link>
          <h1 className="text-center text-[26px] font-extrabold tracking-tight lg:text-left">{title}</h1>
          <p className="mt-1.5 text-center text-[15px] text-muted lg:text-left">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </div>
      </main>
    </div>
  );
}
