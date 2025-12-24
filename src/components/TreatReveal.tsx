"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Treat } from "@/types/database";
import { ConfettiCannon } from "./ConfettiCannon";

interface TreatRevealProps {
  treat: Treat;
  journeySlug: string;
  onComplete: () => void;
}

export function TreatReveal({ treat, journeySlug, onComplete }: TreatRevealProps) {
  const [phase, setPhase] = useState<"countdown" | "reveal" | "complete">("countdown");
  const [count, setCount] = useState(3);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase === "countdown" && count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 600);
      return () => clearTimeout(timer);
    }

    if (count === 0 && phase === "countdown") {
      // Call API to reveal
      fetch(`/api/journey/${journeySlug}/treats/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treatId: treat.id }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to reveal treat");
          }
          setPhase("reveal");
          setTimeout(() => setPhase("complete"), 3000);
        })
        .catch((err) => {
          setError(err.message);
          setPhase("complete");
        });
    }
  }, [phase, count, treat.id, journeySlug]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <AnimatePresence mode="wait">
        {/* Countdown Phase */}
        {phase === "countdown" && count > 0 && (
          <motion.div
            key="countdown"
            className="text-white text-6xl font-serif"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {count}
          </motion.div>
        )}

        {/* Reveal Phase */}
        {phase === "reveal" && !error && (
          <motion.div
            key="reveal"
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative overflow-hidden"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <ConfettiCannon colors={["#E07B39", "#C9A227", "#f97316", "#fbbf24"]} />

            {/* Gift emoji */}
            <motion.p
              className="text-6xl mb-4"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              🎁
            </motion.p>

            {/* Treat name */}
            <motion.h3
              className="font-serif text-2xl text-[#2C1810] mb-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {treat.name}
            </motion.h3>

            {/* Treat description */}
            <motion.p
              className="text-[#6B5344] mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {treat.description}
            </motion.p>

            {/* Cost if present */}
            {treat.estimated_cost && (
              <motion.p
                className="text-sm text-[#E07B39] font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {treat.estimated_cost}
              </motion.p>
            )}

            {/* Close button */}
            <motion.button
              onClick={onComplete}
              className="mt-6 px-6 py-2 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full font-medium hover:shadow-lg transition-all shadow-md"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Got it!
            </motion.button>
          </motion.div>
        )}

        {/* Error Phase */}
        {phase === "complete" && error && (
          <motion.div
            key="error"
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <p className="text-4xl mb-4">😔</p>
            <h3 className="font-serif text-xl text-[#2C1810] mb-2">
              Oops!
            </h3>
            <p className="text-[#6B5344] mb-4">{error}</p>
            <button
              onClick={onComplete}
              className="px-6 py-2 bg-[#6B5344] text-white rounded-full hover:bg-[#5A4535] transition-colors"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
