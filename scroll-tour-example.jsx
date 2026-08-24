import { useRef, useState, useEffect, useMemo } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";

const FIELDS = [
  { label: "Amount", demo: "2500" },
  { label: "Title", demo: "Dinner with friends" },
  { label: "Paid By", demo: "Varun" },
  { label: "Split To", demo: "Rahul, Aditi, Meera" },
];

// har field ka actual on-screen position (container-relative) measure karta hai
function useFieldPositions(containerRef, fieldRefs, n) {
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const pos = fieldRefs.current.map((el) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return {
          x: r.right - cRect.left - 24, // field ke right-inset pe cursor park karo
          y: r.top - cRect.top + r.height / 2 - 8,
        };
      });
      if (pos.length === n) setPositions(pos);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [n]);

  return positions;
}

function TypingField({ innerRef, label, demo, scrollYProgress, moveEnd, end }) {
  const [text, setText] = useState("");

  const charIndex = useTransform(scrollYProgress, [moveEnd, end - 0.02], [0, demo.length]);
  useMotionValueEvent(charIndex, "change", (latest) => {
    setText(demo.slice(0, Math.max(0, Math.min(demo.length, Math.round(latest)))));
  });

  return (
    <div ref={innerRef} className="relative">
      <label className="text-xs text-gray-500">{label}</label>
      <div className="w-full border rounded-lg px-3 py-2 min-h-[40px] border-gray-300">
        {text || <span className="text-gray-400">{label}</span>}
      </div>
    </div>
  );
}

export default function ExpenseFormTour() {
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const fieldRefs = useRef([]);
  const n = FIELDS.length;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const positions = useFieldPositions(containerRef, fieldRefs, n);

  // har field: [start, moveEnd, end] — moveEnd tak cursor pahuchta+click karta hai, baaki typing
  const slots = useMemo(
    () =>
      FIELDS.map((_, i) => {
        const start = i / n;
        const end = (i + 1) / n;
        return { start, end, moveEnd: start + 0.2 * (end - start) };
      }),
    [n]
  );

  // cursor x/y ke liye poori scrollYProgress pe keyframe stops
  const { inputStops, xStops, yStops } = useMemo(() => {
    if (positions.length !== n) return { inputStops: [0, 1], xStops: [0, 0], yStops: [0, 0] };
    const inputStops = [0];
    const xStops = [positions[0].x];
    const yStops = [positions[0].y];
    slots.forEach(({ moveEnd, end }, i) => {
      inputStops.push(moveEnd, end);
      xStops.push(positions[i].x, positions[i].x);
      yStops.push(positions[i].y, positions[i].y);
    });
    return { inputStops, xStops, yStops };
  }, [positions, slots, n]);

  const cursorX = useTransform(scrollYProgress, inputStops, xStops);
  const cursorY = useTransform(scrollYProgress, inputStops, yStops);

  // click pulse: har field ke moveEnd ke aas-paas scale bounce
  const clickStops = slots.flatMap(({ moveEnd }) => [moveEnd - 0.015, moveEnd, moveEnd + 0.015]);
  const clickScales = slots.flatMap(() => [1, 1.6, 1]);
  const cursorScale = useTransform(scrollYProgress, clickStops, clickScales);

  return (
    <section ref={sectionRef} style={{ height: `${n * 100}vh` }}>
      <div className="sticky top-0 h-screen flex items-center justify-center">
        <div ref={containerRef} className="relative w-[300px] rounded-3xl border p-4 space-y-4">
          {FIELDS.map(({ label, demo }, i) => (
            <TypingField
              key={label}
              innerRef={(el) => (fieldRefs.current[i] = el)}
              label={label}
              demo={demo}
              scrollYProgress={scrollYProgress}
              moveEnd={slots[i].moveEnd}
              end={slots[i].end}
            />
          ))}

          {/* custom cursor */}
          <motion.div
            style={{ x: cursorX, y: cursorY, scale: cursorScale }}
            className="absolute top-0 left-0 w-4 h-4 rounded-full bg-black shadow-md pointer-events-none z-10"
          />
        </div>
      </div>
    </section>
  );
}
