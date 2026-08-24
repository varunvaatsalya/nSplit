"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "What is expense splitting?",
    a: "Expense splitting is the process of sharing costs among a group of people (like roommates, travelers, or dinner guests). nSplit calculates exactly who owes what based on individual payments, so you only make the minimum number of settlements at the end.",
  },
  {
    q: "How does the app calculate balances?",
    a: "nSplit automatically aggregates all transactions in a group, offsets duplicate debts, and uses a simplification algorithm to calculate the net balances. This means instead of everyone paying each other back separately, we reduce it to the absolute minimum transfers needed.",
  },
  {
    q: "Can I split an expense unevenly?",
    a: "Yes, absolutely! nSplit supports multiple splitting methods: equally, by exact percentages (e.g. 60/40), by exact rupee amounts, or by custom parts/shares (e.g. 2 shares vs 1 share).",
  },
  {
    q: "Do all group members need the app?",
    a: "No! You can add members to a group even if they don't have an account yet. You can log their expenses and export clean PDF reports to share with them via WhatsApp or email.",
  },
  {
    q: "Is my financial data secure?",
    a: "Yes. We prioritize your privacy and data security. All ledger calculations and session data are stored securely and encrypted in transit.",
  },
];
function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };
  return (
    <div className="relative w-full z-12 bg-background text-foreground">
      {/* 2. Frequently Asked Questions Section */}
      <section id="faq" className="relative py-24 border-t border-border/60 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 -z-10 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl opacity-15 dark:opacity-35" />

        <div className="mx-auto w-full max-w-3xl px-6 text-center">
          {/* Header */}
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-14">
            Frequently Asked Questions
          </h2>

          {/* Accordion List */}
          <div className="flex flex-col gap-4 text-left">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => toggleFAQ(idx)}
                  className={`bg-card/60 border rounded-2xl px-5 py-4 cursor-pointer hover:border-border transition-all duration-300 shadow-lg select-none ${
                    isOpen ? "border-border" : "border-border/50"
                  }`}
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                      {item.q}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="text-slate-450 shrink-0"
                    >
                      <ChevronDown className="h-4.5 w-4.5" />
                    </motion.div>
                  </div>

                  {/* Body Content */}
                  <motion.div
                    initial={false}
                    animate={{ height: isOpen ? "auto" : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="pb-1 text-xs sm:text-sm text-muted-foreground leading-relaxed mt-3.5 border-t border-border/60 pt-3.5 font-sans">
                      {item.a}
                    </p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default FAQ;
