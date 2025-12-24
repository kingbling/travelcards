"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, X } from "lucide-react";
import confetti from "canvas-confetti";

interface Treat {
  id: string;
  name: string;
  description: string | null;
  estimated_cost?: string | null;
}

interface TreatRevealProps {
  treat: Treat;
  themeColors: { primary: string; secondary: string };
  onComplete: () => void;
  onClose?: () => void;
}

export function TreatReveal({ treat, themeColors, onComplete, onClose }: TreatRevealProps) {
  const [phase, setPhase] = useState<
    "gift" | "shake" | "burst" | "reveal" | "celebrate" | "complete"
  >("gift");

  // Phase transitions
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === "gift") {
      timer = setTimeout(() => setPhase("shake"), 800);
    } else if (phase === "shake") {
      timer = setTimeout(() => setPhase("burst"), 600);
    } else if (phase === "burst") {
      timer = setTimeout(() => setPhase("reveal"), 400);
    } else if (phase === "reveal") {
      timer = setTimeout(() => setPhase("celebrate"), 800);
    } else if (phase === "celebrate") {
      // Fire confetti
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.5, x: 0.5 },
        colors: [themeColors.primary, themeColors.secondary, "#FFD700", "#FF69B4"],
        startVelocity: 40,
        gravity: 0.9,
        ticks: 250,
        shapes: ["square", "circle"],
        scalar: 1.1,
      });

      // Side bursts
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: [themeColors.primary, themeColors.secondary, "#FFD700"],
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: [themeColors.primary, themeColors.secondary, "#FFD700"],
        });
      }, 200);

      timer = setTimeout(() => {
        setPhase("complete");
        // Don't auto-close - let user click close button
      }, 2500);
    }

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, themeColors]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Close button - only show after celebration */}
      <AnimatePresence>
        {phase === "complete" && onClose && (
          <motion.button
            onClick={onClose}
            className="absolute top-6 right-6 z-[60] w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-[#2C1810] hover:bg-gray-100 transition-colors"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Background glow */}
      <AnimatePresence>
        {(phase === "reveal" || phase === "celebrate" || phase === "complete") && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              initial={{ width: 0, height: 0 }}
              animate={{ width: 500, height: 500 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                background: `radial-gradient(circle, ${themeColors.primary}50 0%, ${themeColors.secondary}20 50%, transparent 70%)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* GIFT BOX PHASE */}
      <AnimatePresence>
        {(phase === "gift" || phase === "shake") && (
          <motion.div
            className="relative"
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{
              scale: 1,
              rotate: phase === "shake" ? [0, -8, 8, -8, 8, 0] : 0,
              opacity: 1,
            }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: phase === "shake" ? 0.5 : 0.5,
              ease: phase === "shake" ? "linear" : "backOut"
            }}
          >
            <motion.div
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary}90, ${themeColors.secondary}90)`,
                boxShadow: `0 0 60px ${themeColors.primary}60`,
              }}
              animate={{
                y: phase === "gift" ? [0, -12, 0] : 0,
              }}
              transition={{
                y: { repeat: Infinity, duration: 1.2, ease: "easeInOut" },
              }}
            >
              <Gift className="w-16 h-16 sm:w-20 sm:h-20 text-white" />

              {/* Sparkles around gift */}
              {[...Array(6)].map((_, i) => {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * 65;
                const y = Math.sin(angle) * 65;
                return (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.p
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white text-lg font-medium whitespace-nowrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              A special treat for you!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BURST PHASE */}
      <AnimatePresence>
        {phase === "burst" && (
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[...Array(12)].map((_, i) => {
              const angle = (i / 12) * Math.PI * 2;
              return (
                <motion.div
                  key={i}
                  className="absolute w-5 h-5 rounded-full"
                  style={{
                    backgroundColor: i % 2 === 0 ? themeColors.primary : themeColors.secondary
                  }}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: [1, 0],
                    scale: [0, 2],
                    x: Math.cos(angle) * 120,
                    y: Math.sin(angle) * 120,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TREAT REVEAL */}
      <AnimatePresence>
        {(phase === "reveal" || phase === "celebrate" || phase === "complete") && (
          <motion.div
            className="relative max-w-sm w-full mx-4"
            initial={{ scale: 0, opacity: 0, y: 80, rotateY: 90 }}
            animate={{
              scale: phase === "reveal" ? [0, 1.08, 1] : 1,
              opacity: 1,
              y: 0,
              rotateY: 0,
            }}
            transition={{
              duration: 0.8,
              ease: "backOut",
            }}
          >
            {/* Pulsing ring */}
            {phase === "reveal" && (
              <motion.div
                className="absolute inset-0 rounded-3xl -z-10"
                style={{
                  border: `4px solid ${themeColors.primary}`,
                }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0] }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}

            {/* Card */}
            <div
              className="bg-white rounded-3xl overflow-hidden shadow-2xl border-4"
              style={{ borderColor: themeColors.primary }}
            >
              {/* Header with icon */}
              <div
                className="py-10 flex flex-col items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary}25, ${themeColors.secondary}25)`,
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    repeat: phase === "celebrate" ? 3 : 0,
                    duration: 0.5,
                  }}
                >
                  <Gift className="w-20 h-20" style={{ color: themeColors.primary }} />
                </motion.div>
                <motion.div
                  className="mt-3 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: `${themeColors.primary}20`,
                    color: themeColors.primary,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Special Treat
                </motion.div>
              </div>

              {/* Content */}
              <div className="p-6 text-center">
                <h3 className="font-serif text-2xl text-[#2C1810] mb-3">{treat.name}</h3>
                {treat.description && (
                  <p className="text-[#6B5344] leading-relaxed">{treat.description}</p>
                )}
              </div>
            </div>

            {/* Shine effect */}
            {phase === "reveal" && (
              <motion.div
                className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                    width: "40%",
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CELEBRATION TEXT */}
      <AnimatePresence>
        {phase === "celebrate" && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-50"
            initial={{ scale: 0, opacity: 0, y: 30 }}
            animate={{
              scale: [0, 1.15, 1],
              opacity: [0, 1, 1, 0.8],
              y: [30, 0, 0, -10],
            }}
            transition={{ duration: 1.8 }}
          >
            <span
              className="font-serif text-3xl sm:text-4xl font-bold px-8 py-4 rounded-2xl inline-block whitespace-nowrap"
              style={{
                color: themeColors.primary,
                textShadow: `0 0 20px ${themeColors.primary}, 0 0 40px ${themeColors.secondary}`,
                background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)`,
              }}
            >
              Enjoy your treat!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
