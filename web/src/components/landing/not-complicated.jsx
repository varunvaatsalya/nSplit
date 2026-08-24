import React from "react";

function ExpenseNotComplicated() {
  return (
    <section className="sticky top-0 h-screen z-6 w-full bg-background flex items-center justify-center overflow-hidden rounded-b-[40px] md:rounded-b-[48px] border-b border-border shadow-2xl">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-12 py-12">
          {/* Left Column: Floating mockup chat & calculations sheet */}
          <div className="lg:col-span-6 relative flex flex-col gap-6 items-center lg:items-start select-none">
            {/* Card 1: Chat bubble 1 (Multiple Payers problem) */}
            <div className="relative bg-card border border-border rounded-2xl p-4 shadow-md max-w-[275px] w-full self-start transition-transform duration-300 hover:rotate-0 hover:scale-105 cursor-pointer animate-float-chat-1">
              <p className="text-xs font-semibold text-foreground leading-snug">
                "For the &#8377;4,000 hotel room, Aman paid &#8377;2,500 and
                Nidhi paid &#8377;1,500. How do we log multiple payers?"
              </p>
              <p className="mt-2 text-[9px] font-medium text-muted-foreground text-right">
                Yesterday, 10:42 PM
              </p>
            </div>

            {/* Card 2: Chat bubble 2 (Offsets / Cab & Drinks problem) */}
            <div className="relative bg-primary/5 border border-primary/10 rounded-2xl p-4 shadow-md max-w-[275px] w-full self-end lg:mr-8 transition-transform duration-300 hover:rotate-0 hover:scale-105 cursor-pointer animate-float-chat-2">
              <p className="text-xs font-semibold text-foreground leading-snug">
                "I paid for the cab, but Nidhi paid for drinks, so I think I owe
                Aman &#8377;200?"
              </p>
              <p className="mt-2 text-[9px] font-medium text-muted-foreground text-right">
                Today, 9:15 AM
              </p>
            </div>

            {/* Card 3: Chat bubble 3 (Unequal Split problem) */}
            <div
              className="relative bg-card border border-border rounded-2xl p-4 shadow-md max-w-[275px] w-full self-start transition-transform duration-300 hover:rotate-0 hover:scale-105 cursor-pointer animate-float-chat-1"
              style={{ animationDelay: "1.5s" }}
            >
              <p className="text-xs font-semibold text-foreground leading-snug">
                "I'll pay 60% of the villa rent since I got the master room,
                Aman pays 25%, and you pay 15%."
              </p>
              <p className="mt-2 text-[9px] font-medium text-muted-foreground text-right">
                Today, 11:30 AM
              </p>
            </div>

            {/* Card 4: Notepad rough math calculation */}
            <div className="relative bg-rose-50/70 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-5 shadow-lg max-w-[260px] w-full self-end lg:mr-4 transition-transform duration-300 hover:rotate-0 hover:scale-105 cursor-pointer animate-float-notepad font-mono text-[11px] text-rose-900 dark:text-rose-200">
              <div className="flex justify-between border-b border-rose-200/50 pb-1.5 mb-2.5 font-sans font-bold uppercase tracking-wider text-[9px] text-rose-800 dark:text-rose-350">
                <span>Villa Rent</span>
                <span>INR (&#8377;)</span>
              </div>
              <div className="space-y-1.5 font-semibold">
                <div className="flex justify-between">
                  <span>Nidhi (60%)</span>
                  <span>9,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Aman (25%)</span>
                  <span>3,750.00</span>
                </div>
                <div className="flex justify-between">
                  <span>You (15%)</span>
                  <span>2,250.00</span>
                </div>
                <div className="border-t border-dashed border-rose-300/40 my-2.5 pt-2 flex justify-between font-bold text-rose-950 dark:text-rose-100 text-xs">
                  <span>Total Split</span>
                  <span>15,000.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Copywriting Content */}
          <div className="lg:col-span-6 flex flex-col gap-6 text-left">
            <h2 className="text-3xl font-black text-foreground sm:text-4xl lg:text-5xl tracking-tight leading-[1.1] max-w-xl">
              Shared expenses
              <span className="block text-primary">
                shouldn't be complicated.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mt-2 max-w-xl">
              Someone paid for dinner. Someone booked the hotel. Someone covered
              the cab. Suddenly, you have a messy web of who owes what.
            </p>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Manual calculations, group chat notes, and mental math quickly
              become confusing and create awkward situations among friends.
              There has to be a better way.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ExpenseNotComplicated;
