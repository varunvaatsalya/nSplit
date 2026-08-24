"use client";

import React from "react";
import {
  ArrowLeft,
  History,
  Settings,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

export default function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[320px] px-4 py-8 md:max-w-85">
      {/* CSS Animation Keyframes for premium tilt & float */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-left-badge {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes float-right-badge {
          0%, 100% { transform: translateY(0px) rotate(1deg); }
          50% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes phone-gentle-tilt {
          0%, 100% { transform: rotate(-3deg) translateY(0px); }
          50% { transform: rotate(-2deg) translateY(-4px); }
        }
        .animate-float-left {
          animation: float-left-badge 5s ease-in-out infinite;
        }
        .animate-float-right {
          animation: float-right-badge 4.5s ease-in-out infinite;
        }
        .animate-phone-tilt {
          animation: phone-gentle-tilt 7s ease-in-out infinite;
        }
      `}} />

      {/* Background Soft Glow Backdrop */}
      <div className="absolute inset-0 -rotate-3 scale-105 rounded-[48px] bg-linear-to-tr from-primary/10 via-primary/5 to-transparent blur-sm" />

      {/* Outer Phone Container - Tilted and scaled down */}
      <div className="relative mx-auto w-62.5 min-h-125 rounded-[42px] border-8 border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800 shadow-2xl transition-all duration-500 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] md:w-[270px] md:min-h-[540px] -rotate-3 animate-phone-tilt">
        {/* Dynamic Island / Camera Notch */}
        <div className="absolute top-1.5 left-1/2 z-30 h-3.5 w-20 -translate-x-1/2 rounded-full bg-black" />

        {/* Screen Container */}
        <div className="relative flex flex-col h-full min-h-121 overflow-hidden rounded-[34px] bg-background p-3.5 pt-6 text-foreground md:min-h-[524px]">
          
          {/* Header - Styled EXACTLY like groups/[id]/page.js */}
          <div className="flex items-center justify-between mt-2 mb-2.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
              </button>
              {/* Group emoji icon container */}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base">
                🌴
              </span>
              <div className="min-w-0 px-0.5">
                <h3 className="truncate text-[11px] font-semibold tracking-tight">
                  Bali Trip
                </h3>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card hover:bg-muted text-muted-foreground transition-colors cursor-pointer">
                <History className="h-3 w-3" />
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card hover:bg-muted text-muted-foreground transition-colors cursor-pointer">
                <Settings className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Group View Tabs - Styled EXACTLY like groups/[id]/page.js */}
          <div className="mb-3 flex justify-start">
            <div className="inline-flex rounded-full bg-muted-foreground/10 p-0.5 scale-85 origin-left">
              <button className="rounded-full px-2.5 py-0.5 bg-card text-foreground shadow-sm border border-border text-[9px] font-semibold cursor-pointer">
                Expenses
              </button>
              <button className="rounded-full px-2.5 py-0.5 text-muted-foreground hover:text-foreground text-[9px] font-semibold cursor-pointer">
                Balance
              </button>
            </div>
          </div>

          {/* Total Group Spend Card - Custom visual showcase matching nSplit's cards design */}
          <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Group Spend
            </p>
            <p className="mt-0.5 text-xl font-extrabold text-foreground tracking-tight">
              &#8377;41,200.00
            </p>
            
            <div className="mt-2.5 flex items-center justify-between">
              {/* Overlapping Avatars (matching UserAvatar overlap styling) */}
              <div className="flex -space-x-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-[8px] font-bold text-white border border-card ring-1 ring-border">
                  A
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-blue-400 to-indigo-500 text-[8px] font-bold text-white border border-card ring-1 ring-border">
                  Y
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-fuchsia-400 to-purple-500 text-[8px] font-bold text-white border border-card ring-1 ring-border">
                  N
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[7px] font-bold text-muted-foreground border border-card ring-1 ring-border">
                  +1
                </div>
              </div>

              {/* Settled Badge */}
              <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[8px] font-bold text-success">
                Settled up
              </span>
            </div>
          </div>

          {/* Date Label - Styled EXACTLY like groups/[id]/page.js date headers */}
          <h3 className="mt-4 mb-1.5 px-1.5 text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Sun, 24 Oct 2026
          </h3>

          {/* Transactions List - Styled EXACTLY like groups/[id]/page.js (without timestamps to prevent wrapping) */}
          <ul className="space-y-1.5 flex-1">
            
            {/* Transaction Item 1: Seafood Dinner */}
            <li>
              <button className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2.5 text-left transition-colors cursor-pointer hover:border-primary/25 hover:bg-primary-foreground/5">
                {/* Left emoji container */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted-foreground/10 text-base">
                  🦀
                </span>
                
                {/* Middle text section */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold tracking-tight text-[11px]">
                    Seafood Dinner
                  </div>
                  <div className="flex min-w-0 items-center gap-1 text-[9px] text-muted-foreground">
                    <span>Paid by</span>
                    <span className="truncate font-semibold">Aman</span>
                  </div>
                </div>

                {/* Right amount section */}
                <div className="shrink-0 text-right">
                  <div className="text-[11px] font-semibold tabular-nums">
                    &#8377;1,200.00
                  </div>
                  <div className="text-[9px] tabular-nums text-owes">
                    You owe &#8377;300.00
                  </div>
                </div>
              </button>
            </li>

            {/* Transaction Item 2: Island Flights */}
            <li>
              <button className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2.5 text-left transition-colors cursor-pointer hover:border-primary/25 hover:bg-primary-foreground/5">
                {/* Left emoji container */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted-foreground/10 text-base">
                  ✈️
                </span>
                
                {/* Middle text section */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold tracking-tight text-[11px]">
                    Island Flights
                  </div>
                  <div className="flex min-w-0 items-center gap-1 text-[9px] text-muted-foreground">
                    <span>Paid by</span>
                    <span className="truncate font-semibold">You</span>
                  </div>
                </div>

                {/* Right amount section */}
                <div className="shrink-0 text-right">
                  <div className="text-[11px] font-semibold tabular-nums">
                    &#8377;24,000.00
                  </div>
                  <div className="text-[9px] tabular-nums text-positive">
                    You lent &#8377;18,000.00
                  </div>
                </div>
              </button>
            </li>

            {/* Transaction Item 3: Airbnb Booking */}
            <li>
              <button className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2.5 text-left transition-colors cursor-pointer hover:border-primary/25 hover:bg-primary-foreground/5">
                {/* Left emoji container */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted-foreground/10 text-base">
                  🏠
                </span>
                
                {/* Middle text section */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold tracking-tight text-[11px]">
                    Airbnb Booking
                  </div>
                  <div className="flex min-w-0 items-center gap-1 text-[9px] text-muted-foreground">
                    <span>Paid by</span>
                    <span className="truncate font-semibold">Nidhi</span>
                  </div>
                </div>

                {/* Right amount section */}
                <div className="shrink-0 text-right">
                  <div className="text-[11px] font-semibold tabular-nums">
                    &#8377;16,000.00
                  </div>
                  <div className="text-[9px] tabular-nums text-muted-foreground italic">
                    Not involved
                  </div>
                </div>
              </button>
            </li>
          </ul>

          {/* Floating Action Button inside Phone Screen */}
          <div className="absolute bottom-3 right-3">
            <button className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <Plus className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Settlement Badges (Pushed closer to the phone and animated to drift continuously) */}
      
      {/* Left Badge: You owe Aman */}
      <div className="absolute top-[28%] -left-4 sm:-left-8 z-40 hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-lg transition-transform hover:scale-105 duration-300 animate-float-left">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ArrowDownLeft className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[8px] font-medium text-muted-foreground">You owe Aman</p>
          <p className="text-[10px] font-bold text-foreground">&#8377;300.00</p>
        </div>
      </div>

      {/* Right Badge: Nidhi owes you */}
      <div className="absolute bottom-[22%] -right-4 sm:-right-8 z-40 hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-lg transition-transform hover:scale-105 duration-300 animate-float-right">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-success">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[8px] font-medium text-muted-foreground">Nidhi owes you</p>
          <p className="text-[10px] font-bold text-foreground">&#8377;6,000.00</p>
        </div>
      </div>
    </div>
  );
}
