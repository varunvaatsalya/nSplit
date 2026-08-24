"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";
import {
  ArrowLeft,
  MousePointer2,
  Pointer,
  TextCursor,
} from "lucide-react";

const FIELDS = [
  { type: "text", key: "amount", label: "Amount", demo: "1,450.00" },
  { type: "text", key: "title", label: "Title", demo: "Dinner at Mario's" },
  { type: "badge", key: "paidBy", label: "Paid by", demo: "You" },
  { type: "badge", key: "split", label: "Split", demo: "Equally" },
  { type: "button", key: "save", label: "Save", demo: "" },
];

const STEP_DETAILS = [
  {
    title: "1. Input the Amount",
    desc: "Log the total bill in Rupees. nSplit handles large group payments and updates splits with high-precision decimal formatting.",
  },
  {
    title: "2. Enter the Title",
    desc: 'Give your expense a title like "Dinner at Mario\'s". nSplit organizes group expenses dynamically so everyone knows what was purchased.',
  },
  {
    title: "3. Choose Payer & Date",
    desc: "Select who paid for the expense and specify when it happened. Supports splitting between multiple friends at the table.",
  },
  {
    title: "4. Split Method",
    desc: "Split the expense equally among members, or customize splits by percentage. Selecting Equally computes individual shares instantly.",
  },
  {
    title: "5. Save the Expense",
    desc: "Tap Save to instantly record the expense inside your group. Balances are calculated in real-time and updated for all group members.",
  },
];

function useMockupPositions(containerRef, refs, modalOpen, splitMethod) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const pos = {};

      Object.keys(refs).forEach((key) => {
        const el = refs[key].current;
        if (el) {
          const r = el.getBoundingClientRect();
          pos[key] = {
            x: r.left - cRect.left + r.width / 2,
            y: r.top - cRect.top + r.height / 2,
          };
        } else {
          pos[key] = { x: 125, y: 250 }; // Safe fallback
        }
      });
      setPositions(pos);
    };

    measure(); // Measure immediately
    const timer1 = setTimeout(measure, 100);
    const timer2 = setTimeout(measure, 350);

    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("resize", measure);
    };
  }, [refs, containerRef, modalOpen, splitMethod]);

  return positions;
}

export default function ScrollTour() {
  const sectionRef = useRef(null);
  const containerRef = useRef(null);

  const amountRef = useRef(null);
  const titleRef = useRef(null);
  const paidByRef = useRef(null);
  const modalNidhiRef = useRef(null);
  const modalDoneRef = useRef(null);
  const splitMethodRef = useRef(null);
  const partsPlusRef = useRef(null);
  const saveBtnRef = useRef(null);
  const successPopupRef = useRef(null);

  const refs = useMemo(
    () => ({
      amount: amountRef,
      title: titleRef,
      paidBy: paidByRef,
      modalNidhi: modalNidhiRef,
      modalDone: modalDoneRef,
      splitMethod: splitMethodRef,
      partsPlus: partsPlusRef,
      saveBtn: saveBtnRef,
    }),
    [],
  );

  const n = FIELDS.length;
  const [activeIndex, setActiveIndex] = useState(0);

  // Live values states during scrubbing
  const [typedTitle, setTypedTitle] = useState("");
  const [typedAmount, setTypedAmount] = useState("");
  const [showPaidBy, setShowPaidBy] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayers, setSelectedPayers] = useState(["You"]);
  const [splitMethod, setSplitMethod] = useState("Equally");
  const [youParts, setYouParts] = useState(1);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [cursorType, setCursorType] = useState("default");
  const [isSavePressed, setIsSavePressed] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const positions = useMockupPositions(containerRef, refs, modalOpen, splitMethod);

  // Divide the 0->1 scroll range into segments for each of the 5 fields
  const slots = useMemo(
    () =>
      FIELDS.map((_, i) => {
        const start = i / n;
        const end = (i + 1) / n;
        return {
          start,
          end,
          moveEnd: start + 0.25 * (end - start),
        };
      }),
    [n],
  );

  // Generate cursor keyframe positions mapping scroll progress to coordinates
  const cursorCoords = useMemo(() => {
    const def = { x: 125, y: 250 };
    const getCoord = (key) => positions[key] || def;

    const stops = [
      { p: 0.0, k: "amount" },
      { p: 0.15, k: "amount" },
      { p: 0.2, k: "title" },
      { p: 0.35, k: "title" },
      { p: 0.4, k: "paidBy" },
      { p: 0.45, k: "paidBy" },
      { p: 0.48, k: "modalNidhi" },
      { p: 0.53, k: "modalNidhi" },
      { p: 0.56, k: "modalDone" },
      { p: 0.6, k: "modalDone" },
      { p: 0.63, k: "splitMethod" },
      { p: 0.68, k: "splitMethod" },
      { p: 0.72, k: "partsPlus" },
      { p: 0.78, k: "partsPlus" },
      { p: 0.83, k: "saveBtn" },
      { p: 1.0, k: "saveBtn" },
    ];

    return {
      stops: stops.map((s) => s.p),
      x: stops.map((s) => getCoord(s.k).x),
      y: stops.map((s) => getCoord(s.k).y),
    };
  }, [positions]);

  const cursorX = useTransform(
    scrollYProgress,
    cursorCoords.stops,
    cursorCoords.x,
  );
  const cursorY = useTransform(
    scrollYProgress,
    cursorCoords.stops,
    cursorCoords.y,
  );

  // Create a click pulse scale/opacity animation around the click moments
  const clickTimes = [0.02, 0.22, 0.43, 0.5, 0.58, 0.65, 0.75, 0.85];
  const clickStops = clickTimes.flatMap((t) => [t - 0.015, t, t + 0.015]);
  const clickScales = clickTimes.flatMap(() => [1, 0.8, 1]);
  const cursorScale = useTransform(scrollYProgress, clickStops, clickScales);

  const clickOpacities = clickTimes.flatMap(() => [1, 0.5, 1]);
  const cursorOpacity = useTransform(
    scrollYProgress,
    clickStops,
    clickOpacities,
  );



  const getTitleEmoji = () => {
    const len = typedTitle.length;
    if (len === 0) return "📝";
    if (len < 6) return "🏷️";
    if (len < 12) return "🍕";
    return "🍽️";
  };

  // Character index mapping for Amount field (Slot 0)
  const amountCharIndex = useTransform(
    scrollYProgress,
    [slots[0].moveEnd, slots[0].end - 0.02],
    [0, FIELDS[0].demo.length],
  );
  useMotionValueEvent(amountCharIndex, "change", (latest) => {
    setTypedAmount(
      FIELDS[0].demo.slice(
        0,
        Math.max(0, Math.min(FIELDS[0].demo.length, Math.round(latest))),
      ),
    );
  });

  // Character index mapping for Title field (Slot 1)
  const titleCharIndex = useTransform(
    scrollYProgress,
    [slots[1].moveEnd, slots[1].end - 0.02],
    [0, FIELDS[1].demo.length],
  );
  useMotionValueEvent(titleCharIndex, "change", (latest) => {
    setTypedTitle(
      FIELDS[1].demo.slice(
        0,
        Math.max(0, Math.min(FIELDS[1].demo.length, Math.round(latest))),
      ),
    );
  });

  // Activation events for all interactive components
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // 1. Paid By selection visibility on main screen
    setShowPaidBy(latest >= 0.43);

    // Modal open state
    setModalOpen(latest >= 0.45 && latest < 0.6);

    // Payers selection
    if (latest < 0.51) {
      setSelectedPayers(["You"]);
    } else {
      setSelectedPayers(["You", "Nidhi"]);
    }

    // 2. Split selection visibility on main screen
    setShowSplit(latest >= 0.63);

    // Split method
    if (latest < 0.66) {
      setSplitMethod("Equally");
    } else {
      setSplitMethod("Parts");
    }

    // Parts adjustments
    if (latest < 0.76) {
      setYouParts(1);
    } else {
      setYouParts(2);
    }

    // 3. Success Popup
    setShowSuccessPopup(latest >= 0.87);

    // Save button click visual state
    setIsSavePressed(latest >= 0.835 && latest <= 0.865);

    // Determine cursor icon type
    if ((latest >= 0.0 && latest < 0.15) || (latest >= 0.2 && latest < 0.35)) {
      setCursorType("text");
    } else if (
      (latest >= 0.4 && latest < 0.45) ||
      (latest >= 0.48 && latest < 0.53) ||
      (latest >= 0.56 && latest < 0.6) ||
      (latest >= 0.63 && latest < 0.68) ||
      (latest >= 0.72 && latest < 0.78) ||
      (latest >= 0.83 && latest < 0.88) ||
      (latest >= 0.93 && latest < 0.98)
    ) {
      setCursorType("pointer");
    } else {
      setCursorType("default");
    }

    // Update active index for the text descriptions
    const idx = Math.min(n - 1, Math.floor(latest * n));
    setActiveIndex(idx);
  });

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#090b11] text-white overflow-visible animate-none z-7"
      style={{ height: `${n * 160}vh` }}
    >
      <div className="sticky top-0 z-7 bg-[#090b11] h-screen flex items-center justify-center overflow-hidden w-full">
        {/* Typewriter Blinking Cursor Animation */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes cursor-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          .typewriter-cursor {
            animation: cursor-blink 0.8s step-end infinite;
          }
        `,
          }}
        />

        {/* Responsive Grid layout */}
        <div className="mx-auto grid w-full max-w-5xl items-center gap-12 px-6 grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Phone mockup (Pulls to left on desktop, centered on mobile) */}
          <div className="lg:col-span-6 flex justify-center items-center relative w-full">
            {/* Dark Mockup Phone Frame (Scaled slightly down) */}
            <div
              ref={containerRef}
              className="relative w-[250px] h-[500px] rounded-[42px] border-[8px] border-slate-900 bg-slate-950 shadow-[0_0_80px_rgba(var(--color-primary),0.15)] flex flex-col p-4 pt-8 text-slate-200 overflow-hidden"
            >
              {/* Dynamic Island / Notch */}
              <div className="absolute top-2 left-1/2 z-30 h-3.5 w-20 -translate-x-1/2 rounded-full bg-black border border-slate-800/80 shadow-inner" />

              {/* Screen Header */}
              <div className="flex items-center justify-between mt-1.5 mb-5 text-xs px-2 select-none">
                <span className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center">
                  <ArrowLeft className="h-4 w-4" />
                </span>
                <span className="font-extrabold text-slate-100 tracking-tight text-sm">
                  Add Expense
                </span>
                <span className="w-4" />
              </div>

              {/* Form Fields Stack */}
              <div className="space-y-4 flex-1 flex flex-col justify-start pb-16">
                {/* Field 1: Amount Input */}
                <div
                  ref={amountRef}
                  className="flex items-baseline gap-1 py-2.5 border-b border-slate-900"
                >
                  <span className="text-xl font-extrabold text-slate-500">
                    &#8377;
                  </span>
                  <span className="text-4xl font-black text-slate-100 tracking-tight min-h-[40px] flex items-center">
                    {typedAmount || (
                      <span className="text-slate-800">0.00</span>
                    )}
                    {activeIndex === 0 && (
                      <span className="inline-block w-1 h-7 bg-primary ml-1 typewriter-cursor" />
                    )}
                  </span>
                </div>

                {/* Field 2: Title Input */}
                <div ref={titleRef} className="flex items-center gap-3 pb-1">
                  {/* Dashed emoji icon container */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/50 text-lg select-none animate-none">
                    {getTitleEmoji()}
                  </div>
                  <div className="flex-1 min-w-0 border-b border-slate-800/80 pb-1">
                    <div className="min-h-[22px] text-[14px] font-bold text-slate-100 tracking-tight flex items-center">
                      {typedTitle ? (
                        <>
                          <span>{typedTitle}</span>
                          {activeIndex === 1 &&
                            typedTitle.length < FIELDS[1].demo.length && (
                              <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 typewriter-cursor" />
                            )}
                        </>
                      ) : (
                        <span className="text-slate-700 font-medium">Title</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Field 3: Paid By & Date Row (Side-by-side grid) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    ref={paidByRef}
                    className="rounded-xl border border-slate-900 bg-slate-900/20 p-2.5 flex flex-col justify-between h-[54px] cursor-pointer hover:bg-slate-900/30 transition-colors"
                  >
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Paid by
                    </span>
                    <div className="flex items-center min-h-[20px]">
                      {showPaidBy ? (
                        <motion.div
                          layout
                          className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full px-2 py-0.5 text-[8.5px] font-bold text-slate-200 whitespace-nowrap overflow-hidden max-w-full text-ellipsis"
                        >
                          {selectedPayers.length === 1 ? (
                            <>
                              <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 text-[7px] font-bold text-white flex items-center justify-center border border-slate-800">
                                Y
                              </div>
                              You
                            </>
                          ) : (
                            <span className="text-primary-foreground">
                              You & Nidhi
                            </span>
                          )}
                        </motion.div>
                      ) : (
                        <span className="text-[9px] text-slate-750 italic">
                          Payer
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-900 bg-slate-900/20 p-2.5 flex flex-col justify-between h-[54px]">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Date
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">
                      Today, 9:15 PM
                    </span>
                  </div>
                </div>

                {/* Field 4: Members & Split Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      Members
                    </span>
                    <div
                      ref={splitMethodRef}
                      className="min-h-[24px] flex items-center cursor-pointer"
                    >
                      {showSplit ? (
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="inline-flex items-center gap-1 bg-primary/20 border border-primary/20 rounded-full px-2 py-0.5 text-[9px] font-bold text-primary"
                        >
                          {splitMethod}
                        </motion.div>
                      ) : (
                        <span className="text-[9px] text-slate-755 italic">
                          Select method
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-900/80 bg-slate-900/10 p-2 space-y-1.5 font-sans">
                    {[
                      {
                        name: "You",
                        initial: "Y",
                        color: "from-blue-400 to-indigo-500",
                        key: "You",
                      },
                      {
                        name: "Nidhi",
                        initial: "N",
                        color: "from-emerald-400 to-teal-500",
                        key: "Nidhi",
                      },
                      {
                        name: "Aman",
                        initial: "A",
                        color: "from-rose-400 to-orange-500",
                        key: "Aman",
                      },
                    ].map((m) => {
                      let splitText = "-";
                      let partsText = "";

                      if (showSplit) {
                        if (splitMethod === "Equally") {
                          splitText = "₹483.33";
                        } else {
                          const totalParts = youParts + 1 + 1;
                          const mParts = m.key === "You" ? youParts : 1;
                          splitText = `₹${((1450.0 / totalParts) * mParts).toFixed(2)}`;
                          partsText = `${mParts}x`;
                        }
                      }

                      return (
                        <div
                          key={m.name}
                          className="flex items-center justify-between text-[10px] font-semibold text-slate-350 select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`h-4.5 w-4.5 rounded-full bg-gradient-to-r ${m.color} text-[8px] font-bold text-white flex items-center justify-center border border-slate-900`}
                            >
                              {m.initial}
                            </div>
                            <span>{m.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end min-w-[50px]">
                              <span className="text-slate-450 font-mono text-[9.5px]">
                                {splitText}
                              </span>
                              {partsText && (
                                <span className="text-[7.5px] font-bold text-slate-500 tracking-wider uppercase mt-[-2px]">
                                  {partsText}
                                </span>
                              )}
                            </div>

                            {splitMethod === "Parts" && (
                              <div className="flex items-center gap-1 bg-slate-950 border border-slate-900 rounded-md p-0.5">
                                <button className="w-3.5 h-3.5 flex items-center justify-center text-[9px] bg-slate-900 hover:bg-slate-850 rounded-sm text-slate-400 active:scale-90">
                                  -
                                </button>
                                <button
                                  ref={m.key === "You" ? partsPlusRef : null}
                                  className="w-3.5 h-3.5 flex items-center justify-center text-[9px] bg-primary text-primary-foreground font-bold rounded-sm active:scale-90"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Save Button positioned absolutely at bottom of mockup screen */}
              <div 
                ref={saveBtnRef} 
                className="absolute bottom-4 left-4 right-4 z-10 bg-slate-950 pt-2"
              >
                <div 
                  className={`w-full py-2.5 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl text-center shadow-lg shadow-primary/20 select-none transition-all duration-150 ${
                    isSavePressed ? "scale-95 brightness-85 shadow-sm" : "hover:bg-primary/95"
                  }`}
                >
                  Save Expense
                </div>
              </div>

              {/* Paid By Drawer Modal */}
              <div
                className={`absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-40 flex flex-col justify-end transition-opacity duration-300 ${modalOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              >
                <div
                  className={`bg-[#0d0f16] border-t border-slate-900 rounded-t-3xl p-4 space-y-4 transition-transform duration-300 ${modalOpen ? "translate-y-0" : "translate-y-full"}`}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[11px] font-black text-slate-100 uppercase tracking-wider">
                      Multiple Payers
                    </span>
                    <button
                      ref={modalDoneRef}
                      className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg shadow-sm active:scale-95"
                    >
                      Done
                    </button>
                  </div>

                  {/* Payers List */}
                  <div className="space-y-2">
                    {[
                      {
                        name: "You",
                        key: "You",
                        initial: "Y",
                        color: "from-blue-400 to-indigo-500",
                      },
                      {
                        name: "Nidhi",
                        key: "Nidhi",
                        initial: "N",
                        color: "from-emerald-400 to-teal-500",
                      },
                      {
                        name: "Aman",
                        key: "Aman",
                        initial: "A",
                        color: "from-rose-400 to-orange-500",
                      },
                    ].map((p) => {
                      const isSelected = selectedPayers.includes(p.key);
                      let paidAmountText = "-";
                      if (isSelected) {
                        const count = selectedPayers.length;
                        paidAmountText = `₹${(1450.0 / count).toFixed(2)}`;
                      }

                      return (
                        <div
                          key={p.key}
                          ref={p.key === "Nidhi" ? modalNidhiRef : null}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer ${isSelected ? "border-primary/40 bg-primary/5" : "border-slate-900 bg-slate-900/10"}`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-5 w-5 rounded-full bg-gradient-to-r ${p.color} text-[9px] font-bold text-white flex items-center justify-center border border-slate-900`}
                            >
                              {p.initial}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-200">
                              {p.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-mono text-slate-400">
                              {paidAmountText}
                            </span>
                            <div
                              className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-slate-800 bg-slate-950"}`}
                            >
                              {isSelected && (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  className="w-2.5 h-2.5"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Success Confirmation Popup Alert */}
              <div
                className={`absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-300 ${showSuccessPopup ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              >
                <motion.div
                  ref={successPopupRef}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={
                    showSuccessPopup
                      ? { scale: 1, opacity: 1 }
                      : { scale: 0.85, opacity: 0 }
                  }
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  className="bg-[#0e111a] border border-slate-900 rounded-2xl p-5 text-center max-w-[200px] w-full space-y-3.5 shadow-2xl"
                >
                  <div className="mx-auto h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="w-5 h-5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-[11px] font-bold text-slate-100 font-sans">
                      Saved!
                    </h4>
                    <p className="text-[9px] text-slate-450 leading-normal font-sans">
                      Expense saved successfully!
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Custom Interactive Tap Cursor - Dynamic Lucide Icons (Hidden on Success Popup) */}
              {!showSuccessPopup && (
                <motion.div
                  style={{
                    x: cursorX,
                    y: cursorY,
                    scale: cursorScale,
                    opacity: cursorOpacity,
                    translateX: cursorType === "text" ? "-50%" : "-15%",
                    translateY: cursorType === "text" ? "-50%" : "-15%",
                  }}
                  className="absolute top-0 left-0 pointer-events-none z-50 flex items-center justify-center drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)]"
                >
                  {cursorType === "text" && (
                    <TextCursor className="w-5.5 h-5.5" />
                  )}
                  {cursorType === "pointer" && (
                    <Pointer className="w-6 h-6 fill-current" />
                  )}
                  {cursorType === "default" && (
                    <MousePointer2 className="w-6 h-6 fill-current" />
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Column: Titles & Step Descriptions (visible on lg screens, hidden on small screens) */}
          <div className="lg:col-span-6 hidden lg:flex flex-col gap-8 text-left w-full pl-6">
            {/* Top Heading */}
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl lg:text-[40px] font-black tracking-tight leading-tight text-white">
                Everything your group spends.
                <span className="block text-primary mt-1">In one place.</span>
              </h2>
            </div>

            {/* Sliding horizontal cards type explanation block */}
            <div className="min-h-[220px] flex items-center justify-start mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="bg-[#0e111a]/60 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-xs max-w-md w-full flex flex-col gap-3 font-sans"
                >
                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-full self-start">
                    Step {activeIndex + 1} of 5
                  </div>
                  <h3 className="text-xl font-black text-slate-100 tracking-tight mt-1">
                    {STEP_DETAILS[activeIndex].title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                    {STEP_DETAILS[activeIndex].desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
