"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const BENEFIT_ITEMS = [
  "Know exactly where your money went",
  "Stop keeping expense notes manually",
  'Avoid awkward "who owes what?" conversations',
  "Keep every group expense perfectly organized",
  "See global balances at a single glance",
];

export default function LessMath() {
  return (
    <div className="relative w-full z-12 bg-background text-foreground">
      {/* 1. Less Money Math Section */}
      <section className="relative py-24 border-t border-border/60 overflow-hidden bg-background">
        {/* Glow */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl opacity-15 dark:opacity-35" />

        <div className="mx-auto grid w-full max-w-5xl items-center gap-16 px-6 grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Copywriting content */}
          <div className="lg:col-span-6 flex flex-col gap-5 text-left">
            <h2 className="text-3xl sm:text-[40px] font-black tracking-tight leading-tight text-foreground">
              Less money math.
              <span className="block text-primary mt-1">
                More time together.
              </span>
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Focus on the experience, not the receipts. nSplit removes the
              friction from shared spending.
            </p>

            {/* Benefits List */}
            <div className="flex flex-col gap-3.5 mt-4 select-none">
              {BENEFIT_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-foreground">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Premium High-Fidelity Settle-Up Visual Mockup */}
          <div className="lg:col-span-6 flex justify-center items-center relative w-full">
            <div className="bg-card/60 border border-border rounded-[32px] p-8 shadow-2xl backdrop-blur-md w-full max-w-sm relative flex items-center justify-between h-[210px] select-none overflow-hidden">
              {/* Aman Avatar (Sender) */}
              <div className="flex flex-col items-center gap-2.5 z-10">
                <div className="relative h-14 w-14 rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 text-xs font-black text-white flex items-center justify-center border-2 border-rose-500/60 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                  Aman
                  <div className="absolute -bottom-1 h-3.5 w-3.5 rounded-full bg-rose-600 border-2 border-slate-950 flex items-center justify-center text-[7px]">
                    ⬆
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">
                  Paid ₹2,250
                </span>
              </div>

              {/* Glowing Dynamic Settle Line */}
              <div className="flex-1 h-[2px] bg-slate-900 border-t border-dashed border-slate-800 mx-3 relative flex items-center justify-center">
                {/* Active Settled Green Overlay */}
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  }}
                  className="absolute left-0 top-0 h-full bg-emerald-500 shadow-[0_0_8px_#10b981]"
                />

                {/* Floating Amount Bubble */}
                <div className="bg-background border border-border text-emerald-400 font-mono text-[9px] font-black px-2.5 py-0.5 rounded-full absolute -top-8 shadow-md flex items-center gap-1">
                  <span>₹2,250.00</span>
                </div>

                {/* Settle Badge */}
                <span className="bg-emerald-600/90 border border-emerald-500 text-white font-sans text-[9px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full absolute shadow-lg shadow-emerald-500/10">
                  Settled
                </span>
              </div>

              <div className="flex flex-col items-center gap-2.5 z-10">
                <div className="relative h-14 w-14 rounded-full bg-linear-to-tr from-emerald-500 to-teal-400 text-xs font-black text-white flex items-center justify-center border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  Varun
                  <div className="absolute -bottom-1 h-3.5 w-3.5 rounded-full bg-emerald-600 border-2 border-slate-950 flex items-center justify-center text-[7px]">
                    ✔
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">
                  Received
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
