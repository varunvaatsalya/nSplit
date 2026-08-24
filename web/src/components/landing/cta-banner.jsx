import React from "react";
import { Logo } from "../brand/logo";
import Link from "next/link";
import { FaGooglePlay } from "react-icons/fa";

function CTABanner({ ctaHref }) {
  return (
    <section className="relative py-24 border-t border-border overflow-hidden w-full bg-primary-foreground z-12">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[280px] w-[280px] rounded-full bg-emerald-500/5 blur-3xl opacity-15 dark:opacity-35" />

      <div className="mx-auto w-full max-w-3xl px-6 text-center flex flex-col items-center select-none">
        <div className="mb-6 flex items-center justify-center rounded-2xl bg-background p-2.5 -rotate-12 border border-primary text-primary shadow-lg">
          <div className="p-1 rounded-xl bg-primary text-white">
            <Logo className="h-10 w-10" />
          </div>
        </div>

        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
          Ready to make shared expenses simple?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground font-light max-w-lg mb-8 leading-relaxed">
          Create your first group today and stop worrying about who owes what.
          It's completely free to start.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Link
            href={ctaHref}
            className="rounded-full bg-foreground text-background px-8 py-3.5 text-sm font-extrabold hover:opacity-90 transition-opacity shadow-lg"
          >
            Get Started for Free
          </Link>
          <div className="flex items-center gap-2.5 rounded-xl bg-foreground border border-border text-muted-foreground px-6 py-3.5 text-xs font-extrabold shadow-md">
            <FaGooglePlay className="text-background size-4" />
            <div className="text-background text-sm flex flex-col">
              <div className="text-xs text-background/70 text-start font-medium">Android App</div>
              <div className="font-bold">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CTABanner;
