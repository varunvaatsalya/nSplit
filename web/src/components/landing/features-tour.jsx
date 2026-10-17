"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { Check, Scale, Percent, IndianRupee, Users, Handshake, Sparkles, TrendingUp } from "lucide-react";

const SPLIT_METHODS = [
  {
    key: "Equally",
    label: "Equally",
    icon: Scale,
    activeColor: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    iconBg: "bg-emerald-500/10",
    title: "Smart splitting options",
    subtitle: "Equally Split",
    desc: "Split the check evenly in one tap. nSplit instantly calculates equal shares down to the paisa for all members, making group dinners or casual outings hassle-free.",
  },
  {
    key: "Percentages",
    label: "By Percentages",
    icon: Percent,
    activeColor: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    iconBg: "bg-blue-500/10",
    title: "Smart splitting options",
    subtitle: "Split By Percentages",
    desc: "Perfect for trip expenses where members contribute unequal shares. Specify exact percentage cuts for each friend (e.g. 50%, 30%, 20%) and watch calculations adapt in real-time.",
  },
  {
    key: "Exact",
    label: "Exact Amounts",
    icon: IndianRupee,
    activeColor: "border-purple-500/30 bg-purple-500/5 text-purple-400",
    iconBg: "bg-purple-500/10",
    title: "Smart splitting options",
    subtitle: "Split By Exact Amounts",
    desc: "Settle individual itemized bills with high precision. Input exact rupee amounts for each person to ensure everyone pays precisely for what they ordered.",
  },
  {
    key: "Shares",
    label: "Shares",
    icon: Users,
    activeColor: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    iconBg: "bg-amber-500/10",
    title: "Smart splitting options",
    subtitle: "Split By Shares",
    desc: "Use custom shares (e.g., 2 shares for You, 1 share for Aman) to split rent by room size, coordinate shared subscriptions, or adjust weights easily.",
  },
];

export default function FeaturesTour() {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // Map 0->1 progress to 4 steps
    const index = Math.min(SPLIT_METHODS.length - 1, Math.floor(latest * SPLIT_METHODS.length));
    setActiveIndex(index);
  });

  const activeMethod = SPLIT_METHODS[activeIndex];

  return (
    <div id="features" className="relative w-full bg-background text-foreground z-8">
      {/* 1. Sticky Stacking Splitting Methods Tour */}
      {/* Scroll moves through the 4 methods; shorter on phones so it doesn't drag. */}
      <section ref={containerRef} className="relative w-full h-[320vh] lg:h-[480vh]">
        <div className="sticky top-0 z-8 bg-background h-screen flex items-center justify-center overflow-hidden">

          {/* Ambient Glows */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -z-10 h-87.5 w-87.5 rounded-full bg-primary/10 blur-3xl opacity-30 dark:opacity-60" />
          <div className="absolute top-1/3 right-1/4 -translate-y-1/2 -z-10 h-75 w-75 rounded-full bg-emerald-500/5 blur-3xl opacity-20 dark:opacity-40" />

          {/* Phones: heading, options (2x2), then the card. Desktop: options left, heading + card right. */}
          <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-y-6 px-6 lg:grid-cols-12 lg:gap-x-16">

            {/* Heading */}
            <div className="order-1 flex flex-col gap-2 lg:order-none lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:self-end lg:pl-8">
              <div className="mb-1 hidden h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner sm:flex">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-[28px] font-black leading-tight tracking-tight text-foreground sm:text-3xl lg:text-[40px]">
                Smart splitting options.
                <span className="mt-1 block text-primary">For any occasion.</span>
              </h2>
            </div>

            {/* Choose how to split */}
            <div className="relative order-2 flex w-full items-center justify-center lg:order-none lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              <div className="w-full max-w-md select-none rounded-[24px] border border-border bg-card/85 p-3 shadow-[0_0_60px_rgba(0,0,0,0.15)] backdrop-blur-md dark:shadow-[0_0_60px_rgba(0,0,0,0.5)] lg:max-w-[280px] lg:rounded-[28px] lg:p-6">
                <h3 className="mb-3 hidden text-center text-[10px] font-black uppercase tracking-widest text-slate-500 lg:mb-5 lg:block">
                  Choose how to split
                </h3>
                <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-3">
                  {SPLIT_METHODS.map((method, idx) => {
                    const isActive = activeIndex === idx;
                    const IconComponent = method.icon;
                    return (
                      <button
                        type="button"
                        key={method.key}
                        onClick={() => setActiveIndex(idx)}
                        className={`flex cursor-pointer items-center justify-between rounded-2xl border p-2.5 text-left transition-all duration-300 lg:p-3 ${
                          isActive
                            ? method.activeColor + " shadow-lg shadow-black/10 dark:shadow-black/30 lg:scale-[1.03]"
                            : "border-slate-200 bg-slate-50/50 text-slate-500 hover:text-slate-800 dark:border-slate-900 dark:bg-slate-950/20 dark:hover:text-slate-300"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all lg:h-8 lg:w-8 ${
                              isActive ? method.iconBg : "bg-muted/20 dark:bg-slate-900/50"
                            }`}
                          >
                            <IconComponent className="h-4 w-4 lg:h-4.5 lg:w-4.5" />
                          </div>
                          <span className="truncate text-[12px] font-extrabold tracking-tight lg:text-[13px]">{method.label}</span>
                        </div>
                        {isActive && (
                          <div className={`hidden h-4.5 w-4.5 items-center justify-center rounded-full text-white lg:flex ${
                            activeIndex === 0 ? "bg-emerald-500" :
                            activeIndex === 1 ? "bg-blue-500" :
                            activeIndex === 2 ? "bg-purple-500" : "bg-amber-500"
                          }`}>
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* The selected method */}
            <div className="order-3 flex min-h-44 items-start lg:order-none lg:col-span-7 lg:col-start-6 lg:row-start-2 lg:pl-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-border bg-card/60 p-5 font-sans shadow-2xl backdrop-blur-xs lg:p-6"
                >
                  <div className={`self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    activeIndex === 0 ? "bg-emerald-500/10 text-emerald-400" :
                    activeIndex === 1 ? "bg-blue-500/10 text-blue-400" :
                    activeIndex === 2 ? "bg-purple-500/10 text-purple-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    Option {activeIndex + 1} of 4
                  </div>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-foreground lg:text-xl">
                    {activeMethod.subtitle}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {activeMethod.desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Crystal Clear Balances Section */}
      <section className="relative pt-28 pb-20 bg-background border-t border-border/60 overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 -z-10 h-75 w-75 rounded-full bg-emerald-500/5 blur-3xl opacity-20 dark:opacity-40" />

        <div className="mx-auto grid w-full max-w-5xl items-center gap-16 px-6 grid-cols-1 lg:grid-cols-12">
          
          {/* Left: Copywriting info */}
          <div className="lg:col-span-5 flex flex-col gap-4 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-3xl lg:text-[38px] font-black tracking-tight leading-tight text-foreground">
              Crystal clear balances.
              <span className="block text-primary mt-1">No guessing.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-md">
              Stop guessing. The dashboard distills all group activity into a simple summary. See exactly your net position across all friends and groups at a single glance.
            </p>
          </div>

          {/* Right: Balances high-fidelity cards */}
          <div className="lg:col-span-7 flex justify-center items-center relative w-full">
            <div className="bg-card/70 border border-border rounded-[28px] p-6 shadow-2xl backdrop-blur-md w-full max-w-85 flex flex-col gap-4 select-none">
              
              {/* Record 1: Rahul M. owes you */}
              <div className="flex items-center justify-between bg-background/50 border border-border/80 rounded-2xl p-4.5 transition-transform hover:scale-[1.02] duration-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-linear-to-r from-blue-400 to-indigo-500 text-[10px] font-bold text-white flex items-center justify-center border border-border/80 shadow-md">
                    RM
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-extrabold text-foreground">Rahul M.</span>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">owes you</span>
                  </div>
                </div>
                <span className="text-[14px] font-mono font-black text-emerald-400">+₹450.00</span>
              </div>

              {/* Record 2: Priya S. you owe */}
              <div className="flex items-center justify-between bg-background/50 border border-border/80 rounded-2xl p-4.5 transition-transform hover:scale-[1.02] duration-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-linear-to-r from-emerald-400 to-teal-500 text-[10px] font-bold text-white flex items-center justify-center border border-border/80 shadow-md">
                    PS
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-extrabold text-foreground">Priya S.</span>
                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">you owe</span>
                  </div>
                </div>
                <span className="text-[14px] font-mono font-black text-rose-400">-₹285.00</span>
              </div>

              {/* Total Balance Card */}
              <div className="bg-background border border-border rounded-2xl p-4.5 flex items-center justify-between mt-2.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Your total balance</span>
                <span className="text-md font-mono font-black text-emerald-400">+₹165.00</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. Settle Up Stress-Free Section */}
      <section className="relative pt-20 pb-28 bg-background border-t border-border/60 overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -z-10 h-75 w-75 rounded-full bg-rose-500/5 blur-3xl opacity-15 dark:opacity-35" />

        <div className="mx-auto grid w-full max-w-5xl items-center gap-16 px-6 grid-cols-1 lg:grid-cols-12">
          
          {/* Left: High fidelity settle up mockup card */}
          <div className="lg:col-span-5 flex justify-center items-center relative w-full order-2 lg:order-1">
            <div className="bg-card/70 border border-border rounded-[28px] p-6 shadow-2xl backdrop-blur-md w-full max-w-75 flex flex-col items-center gap-5 select-none text-center">
              
              {/* Handshake circle decoration */}
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
                <Handshake className="h-7 w-7" />
              </div>

              {/* Title descriptions */}
              <div className="space-y-1.5">
                <h3 className="text-[15px] font-black text-foreground">Settle Up</h3>
                <p className="text-[10px] text-muted-foreground leading-normal max-w-52.5 mx-auto">
                  Record a cash payment or use an external app to settle your debt with Priya.
                </p>
              </div>

              {/* Amount visual pill */}
              <div className="bg-background/60 border border-border/80 py-3.5 px-6 rounded-2xl w-full max-w-50 flex flex-col gap-1 items-center">
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Amount to settle</span>
                <span className="text-xl font-mono font-black text-emerald-400">₹285.00</span>
              </div>

              {/* CTA Button */}
              <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98]">
                Record Payment
              </button>

            </div>
          </div>

          {/* Right: Copywriting info */}
          <div className="lg:col-span-7 flex flex-col gap-4 text-left order-1 lg:order-2 pl-0 lg:pl-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 mb-2">
              <Check className="h-5 w-5 stroke-[3.5]" />
            </div>
            <h2 className="text-3xl lg:text-[38px] font-black tracking-tight leading-tight text-foreground">
              Settle up stress-free.
              <span className="block text-rose-400 mt-1">Calmly.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-md">
              When you're ready, hit 'Settle Up'. We calculate the fewest number of transactions needed to clear all debts. Record cash payments or jump straight to your favorite payment app.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
