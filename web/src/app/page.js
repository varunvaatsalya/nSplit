import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import PhoneMockup from "@/components/landing/phone-mockup";
import ScrollTour from "@/components/landing/scroll-tour";
import FeaturesTour from "@/components/landing/features-tour";
import HowItWorksGrid from "@/components/landing/how-it-works-grid";
import { Logo } from "@/components/brand/logo";
import {
  Check,
  Play,
  ReceiptText,
  Calculator,
  Scale,
  Handshake,
} from "lucide-react";
import ExpenseNotComplicated from "@/components/landing/not-complicated";
import FAQ from "@/components/landing/faq";
import LessMath from "@/components/landing/less-math";
import Footer from "@/components/landing/footer";
import CTABanner from "@/components/landing/cta-banner";

export default async function HomePage() {
  const session = await getSessionUser();
  const isLoggedIn = Boolean(session?.user);
  const ctaHref = isLoggedIn ? "/groups" : "/login";

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* CSS Animation Keyframes for middle section floating visuals */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes float-bubble-1 {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes float-bubble-2 {
          0%, 100% { transform: translateY(0px) rotate(2deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes float-notepad-sheet {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-6px) rotate(0.5deg); }
        }
        .animate-float-chat-1 {
          animation: float-bubble-1 6s ease-in-out infinite;
        }
        .animate-float-chat-2 {
          animation: float-bubble-2 5.5s ease-in-out infinite 0.7s;
        }
        .animate-float-notepad {
          animation: float-notepad-sheet 7s ease-in-out infinite 0.3s;
        }
      `,
        }}
      />

      {/* Header / Navigation */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground"
        >
          <Logo className="h-10 w-10 text-primary" />
          <span className="font-extrabold text-2xl bg-linear-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            nSplit
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
          <Link
            href="#features"
            className="hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="hover:text-foreground transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="#use-cases"
            className="hover:text-foreground transition-colors"
          >
            Use Cases
          </Link>
          <Link href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </Link>
        </nav>

        {/* Right Nav Auth CTA */}
        <div className="flex items-center gap-5">
          {isLoggedIn ? (
            <Link
              href="/groups"
              className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Go to groups
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-10 lg:pt-16">
        <section className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Heading and copy */}
          <div className="flex flex-col items-start lg:col-span-7">
            {/* Smarter Way Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              The smarter way to share
            </div>

            {/* Main Title Heading */}
            <h1 className="mt-6 text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-[68px] leading-[1.05] max-w-xl sm:max-w-2xl">
              Split expenses.
              <span className="block mt-1">Stay even.</span>
              <span className="block mt-1 text-primary">Keep it simple.</span>
            </h1>

            {/* Subtext Copy */}
            <p className="mt-6 text-base text-muted-foreground sm:text-lg leading-relaxed max-w-lg">
              Track group expenses, split bills instantly, and settle balances
              without the awkward calculations. The perfectly organized way to
              manage shared money.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={ctaHref}
                className="rounded-full bg-primary text-primary-foreground px-8 py-3.5 text-sm font-bold shadow-lg shadow-primary/25 hover:opacity-95 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
              >
                {isLoggedIn ? "Go to groups" : "Get Started"}
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current text-foreground" />
                See How It Works
              </Link>
            </div>

            {/* Verification Subtext */}
            <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </div>
              Less calculating. More enjoying.
            </div>
          </div>

          {/* Right Column: High-fidelity phone mockup with blurry glow */}
          <div className="flex justify-center lg:col-span-5 relative">
            <div className="absolute top-1/2 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
            <PhoneMockup />
          </div>
        </section>

        {/* 4-Column Horizontal Features Bar */}
        <section className="border-t border-b border-border py-10 mt-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            {
              icon: <ReceiptText className="h-6 w-6 text-primary" />,
              title: "Easy Tracking",
              desc: "Log expenses in seconds",
            },
            {
              icon: <Calculator className="h-6 w-6 text-primary" />,
              title: "Auto Calculations",
              desc: "No more mental math",
            },
            {
              icon: <Scale className="h-6 w-6 text-primary" />,
              title: "Clear Balances",
              desc: "Know exactly who owes who",
            },
            {
              icon: <Handshake className="h-6 w-6 text-primary" />,
              title: "Simple Settlements",
              desc: "Record payments effortlessly",
            },
          ].map((item, idx) => (
            <div
              key={item.title}
              className={`flex flex-col items-center text-center px-4 ${
                idx !== 3 ? "md:border-r md:border-border" : ""
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                {item.icon}
              </div>
              <h4 className="mt-3.5 text-sm font-bold text-foreground tracking-tight">
                {item.title}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </section>

        {/* Shared expenses shouldn't be complicated Section */}
      </main>

      {/* Shared expenses shouldn't be complicated Section - Sticky stack layer */}
      <ExpenseNotComplicated />

      {/* Scroll-Driven Expense Tour Section */}
      <ScrollTour />

      {/* Dynamic Features Tour Section */}
      <FeaturesTour />

      {/* How it works & Built for every group Sections */}
      <HowItWorksGrid />

      {/* Less money math & FAQ Sections */}
      <LessMath />

      <FAQ />

      <CTABanner ctaHref={ctaHref} />

      {/* Footer Section */}
      <Footer />
    </div>
  );
}
