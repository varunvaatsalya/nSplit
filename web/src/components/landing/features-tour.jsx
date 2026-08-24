"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from "framer-motion";
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
    <div className="relative w-full bg-[#090b11] text-white z-8">
      {/* 1. Sticky Stacking Splitting Methods Tour */}
      <section ref={containerRef} className="relative w-full" style={{ height: `${SPLIT_METHODS.length * 120}vh` }}>
        <div className="sticky top-0 z-8 bg-[#090b11] h-screen flex items-center justify-center overflow-hidden">
          
          {/* Ambient Glows */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -z-10 h-[350px] w-[350px] rounded-full bg-primary/10 blur-3xl opacity-60" />
          <div className="absolute top-1/3 right-1/4 -translate-y-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-3xl opacity-40" />

          <div className="mx-auto grid w-full max-w-5xl items-center gap-16 px-6 grid-cols-1 lg:grid-cols-12">
            
            {/* Left Column: Stuck Choose How to Split widget */}
            <div className="lg:col-span-5 flex justify-center items-center relative w-full">
              <div className="bg-[#0c0e16]/80 border border-slate-900 rounded-[28px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] backdrop-blur-md w-full max-w-[280px] select-none">
                
                {/* Header */}
                <h3 className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest mb-5">
                  Choose how to split
                </h3>
                
                {/* Options List */}
                <div className="flex flex-col gap-3">
                  {SPLIT_METHODS.map((method, idx) => {
                    const isActive = activeIndex === idx;
                    const IconComponent = method.icon;
                    return (
                      <div
                        key={method.key}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${
                          isActive
                            ? method.activeColor + " scale-[1.03] shadow-lg shadow-black/20"
                            : "border-slate-900 bg-slate-950/20 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                              isActive ? method.iconBg : "bg-slate-900/50"
                            }`}
                          >
                            <IconComponent className="h-4.5 w-4.5" />
                          </div>
                          <span className="text-[13px] font-extrabold tracking-tight">{method.label}</span>
                        </div>
                        {isActive && (
                          <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-white ${
                            activeIndex === 0 ? "bg-emerald-500" :
                            activeIndex === 1 ? "bg-blue-500" :
                            activeIndex === 2 ? "bg-purple-500" : "bg-amber-500"
                          }`}>
                            <Check className="h-3 w-3 stroke-[3.5]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Sliding descriptions */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-left pl-0 lg:pl-8">
              {/* Splitting Icon & Section Title */}
              <div className="flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2 shadow-inner">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-3xl lg:text-[40px] font-black tracking-tight leading-tight text-white">
                  Smart splitting options.
                  <span className="block text-primary mt-1">For any occasion.</span>
                </h2>
              </div>

              {/* Steps Horizontal Sliding Card Deck */}
              <div className="min-h-[190px] flex items-center justify-start mt-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="bg-[#0e111a]/60 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-xs max-w-md w-full flex flex-col gap-3 font-sans"
                  >
                    <div className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full self-start ${
                      activeIndex === 0 ? "bg-emerald-500/10 text-emerald-400" :
                      activeIndex === 1 ? "bg-blue-500/10 text-blue-400" :
                      activeIndex === 2 ? "bg-purple-500/10 text-purple-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      Option {activeIndex + 1} of 4
                    </div>
                    <h3 className="text-xl font-black text-slate-100 tracking-tight mt-1">
                      {activeMethod.subtitle}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {activeMethod.desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Crystal Clear Balances Section */}
      <section className="relative pt-28 pb-20 bg-background border-t border-slate-900/60 overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-3xl opacity-40" />

        <div className="mx-auto grid w-full max-w-5xl items-center gap-16 px-6 grid-cols-1 lg:grid-cols-12">
          
          {/* Left: Copywriting info */}
          <div className="lg:col-span-5 flex flex-col gap-4 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/30 text-primary mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-3xl lg:text-[38px] font-black tracking-tight leading-tight text-white">
              Crystal clear balances.
              <span className="block text-primary mt-1">No guessing.</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-md">
              Stop guessing. The dashboard distills all group activity into a simple summary. See exactly your net position across all friends and groups at a single glance.
            </p>
          </div>

          {/* Right: Balances high-fidelity cards */}
          <div className="lg:col-span-7 flex justify-center items-center relative w-full">
            <div className="bg-[#0c0e16]/60 border border-slate-900/80 rounded-[28px] p-6 shadow-2xl backdrop-blur-md w-full max-w-[340px] flex flex-col gap-4 select-none">
              
              {/* Record 1: Rahul M. owes you */}
              <div className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded-2xl p-4.5 transition-transform hover:scale-[1.02] duration-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 text-[10px] font-bold text-white flex items-center justify-center border border-slate-900 shadow-md">
                    RM
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-extrabold text-slate-200">Rahul M.</span>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">owes you</span>
                  </div>
                </div>
                <span className="text-[14px] font-mono font-black text-emerald-400">+$45.00</span>
              </div>

              {/* Record 2: Priya S. you owe */}
              <div className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded-2xl p-4.5 transition-transform hover:scale-[1.02] duration-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-[10px] font-bold text-white flex items-center justify-center border border-slate-900 shadow-md">
                    PS
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-extrabold text-slate-200">Priya S.</span>
                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">you owe</span>
                  </div>
                </div>
                <span className="text-[14px] font-mono font-black text-rose-400">-$28.50</span>
              </div>

              {/* Total Balance Card */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4.5 flex items-center justify-between mt-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Your total balance</span>
                <span className="text-md font-mono font-black text-emerald-400">+$16.50</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. Settle Up Stress-Free Section */}
      <section className="relative pt-20 pb-28 bg-background border-slate-900/60 overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-rose-500/5 blur-3xl opacity-35" />

        <div className="mx-auto grid w-full max-w-5xl items-center gap-16 px-6 grid-cols-1 lg:grid-cols-12">
          
          {/* Left: High fidelity settle up mockup card */}
          <div className="lg:col-span-5 flex justify-center items-center relative w-full order-2 lg:order-1">
            <div className="bg-[#0c0e16]/60 border border-slate-900/80 rounded-[28px] p-6 shadow-2xl backdrop-blur-md w-full max-w-[300px] flex flex-col items-center gap-5 select-none text-center">
              
              {/* Handshake circle decoration */}
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
                <Handshake className="h-7 w-7" />
              </div>

              {/* Title descriptions */}
              <div className="space-y-1.5">
                <h3 className="text-[15px] font-black text-slate-100">Settle Up</h3>
                <p className="text-[10px] text-slate-400 leading-normal max-w-[210px] mx-auto">
                  Record a cash payment or use an external app to settle your debt with Priya.
                </p>
              </div>

              {/* Amount visual pill */}
              <div className="bg-slate-950/60 border border-slate-900/80 py-3.5 px-6 rounded-2xl w-full max-w-[200px] flex flex-col gap-1 items-center">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Amount to settle</span>
                <span className="text-xl font-mono font-black text-emerald-400">$28.50</span>
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
            <h2 className="text-3xl lg:text-[38px] font-black tracking-tight leading-tight text-white">
              Settle up stress-free.
              <span className="block text-rose-400 mt-1">Calmly.</span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-md">
              When you're ready, hit 'Settle Up'. We calculate the fewest number of transactions needed to clear all debts. Record cash payments or jump straight to your favorite payment app.
            </p>
          </div>

        </div>
      </section>
    </div>
  );
}
