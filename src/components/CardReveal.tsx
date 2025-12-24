"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExperienceCard, getRarityConfig, CATEGORY_CONFIG } from "@/types";
import { Card } from "./Card";
import { Sparkles, Gift } from "lucide-react";

interface CardRevealProps {
  card: ExperienceCard;
  onComplete?: () => void;
}

// Confetti particle component
function Confetti({ color, delay }: { color: string; delay: number }) {
  const randomX = (Math.random() - 0.5) * 600;
  const randomRotate = Math.random() * 720 - 360;
  const randomSize = Math.random() * 8 + 4;

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 pointer-events-none"
      initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0.5],
        x: randomX,
        y: [0, -100, 400],
        rotate: randomRotate,
      }}
      transition={{
        duration: 2.5,
        delay,
        ease: "easeOut",
      }}
    >
      <div
        className="rounded-sm"
        style={{
          width: randomSize,
          height: randomSize,
          backgroundColor: color,
        }}
      />
    </motion.div>
  );
}

// Light ray effect
function LightRay({ angle, delay }: { angle: number; delay: number }) {
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 origin-left pointer-events-none"
      style={{
        width: "400px",
        height: "4px",
        background: "linear-gradient(90deg, rgba(255,215,0,0.8) 0%, transparent 100%)",
        rotate: angle,
      }}
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: [0, 1, 0], scaleX: [0, 1, 1.5] }}
      transition={{ duration: 1, delay }}
    />
  );
}

export function CardReveal({ card, onComplete }: CardRevealProps) {
  const [phase, setPhase] = useState<"package" | "opening" | "rarityReveal" | "cardGrow" | "celebration" | "complete">("package");
  const rarityConfig = getRarityConfig(card.rarity);
  const categoryConfig = CATEGORY_CONFIG[card.category];

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (phase === "opening") {
      timer = setTimeout(() => setPhase("rarityReveal"), 800);
    } else if (phase === "rarityReveal") {
      timer = setTimeout(() => setPhase("cardGrow"), 1500);
    } else if (phase === "cardGrow") {
      timer = setTimeout(() => setPhase("celebration"), 1200);
    } else if (phase === "celebration") {
      timer = setTimeout(() => {
        setPhase("complete");
        onComplete?.();
      }, 2000);
    }

    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  const handleOpen = () => {
    if (phase === "package") {
      setPhase("opening");
    }
  };

  // Get confetti colors based on rarity
  const confettiColors = {
    common: ["#8B7355", "#C9A227", "#E5DDD5"],
    uncommon: ["#10B981", "#34D399", "#6EE7B7"],
    rare: ["#3B82F6", "#60A5FA", "#93C5FD"],
    legendary: ["#F59E0B", "#FBBF24", "#FCD34D", "#EF4444", "#F87171"],
  }[card.rarity];

  return (
    <div className="relative w-full min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background glow that grows */}
      <AnimatePresence>
        {(phase === "rarityReveal" || phase === "cardGrow" || phase === "celebration" || phase === "complete") && (
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
                background: `radial-gradient(circle, ${rarityConfig.color}50 0%, ${rarityConfig.color}20 50%, transparent 70%)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Light rays */}
      <AnimatePresence>
        {phase === "rarityReveal" && (
          <>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <LightRay key={angle} angle={angle} delay={i * 0.05} />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Confetti explosion */}
      <AnimatePresence>
        {phase === "celebration" && (
          <>
            {[...Array(50)].map((_, i) => (
              <Confetti
                key={i}
                color={confettiColors[i % confettiColors.length]}
                delay={i * 0.02}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Package/Gift Box */}
      <AnimatePresence>
        {phase === "package" && (
          <motion.div
            className="relative cursor-pointer"
            onClick={handleOpen}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="w-32 h-32 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${rarityConfig.color}40 0%, ${rarityConfig.color}20 100%)`,
                boxShadow: `0 0 40px ${rarityConfig.color}40`,
              }}
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: "easeInOut",
              }}
            >
              <Gift className="w-16 h-16" style={{ color: rarityConfig.color }} />
            </motion.div>

            <motion.div
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-5 h-5 text-[#C9A227] mx-auto mb-1" />
              <span className="text-sm text-[#6B5344] font-medium">Tap to open</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Opening burst effect */}
      <AnimatePresence>
        {phase === "opening" && (
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{ backgroundColor: rarityConfig.color }}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [1, 0],
                  scale: [0, 1.5],
                  x: Math.cos((i / 12) * Math.PI * 2) * 100,
                  y: Math.sin((i / 12) * Math.PI * 2) * 100,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rarity badge reveal */}
      <AnimatePresence>
        {phase === "rarityReveal" && (
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <motion.div
              className="text-center"
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], rotate: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "backOut" }}
            >
              <motion.div
                className="text-7xl mb-4"
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut",
                }}
              >
                {categoryConfig.icon}
              </motion.div>
              <motion.div
                className="px-6 py-3 rounded-full text-2xl font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: rarityConfig.bgColor,
                  color: rarityConfig.color,
                  boxShadow: `0 0 30px ${rarityConfig.color}60`,
                }}
                animate={{
                  boxShadow: [
                    `0 0 30px ${rarityConfig.color}60`,
                    `0 0 50px ${rarityConfig.color}90`,
                    `0 0 30px ${rarityConfig.color}60`,
                  ],
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {rarityConfig.label}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card growth animation */}
      <AnimatePresence>
        {(phase === "cardGrow" || phase === "celebration" || phase === "complete") && (
          <motion.div
            className="relative z-20"
            initial={{ scale: 0, opacity: 0, y: 100, rotateY: 180 }}
            animate={{
              scale: phase === "cardGrow" ? [0, 1.2, 1] : 1,
              opacity: 1,
              y: 0,
              rotateY: 0,
            }}
            transition={{
              duration: 1.2,
              ease: "backOut",
            }}
          >
            {/* Pulsing ring behind card during growth */}
            {phase === "cardGrow" && (
              <motion.div
                className="absolute inset-0 rounded-2xl -z-10"
                style={{
                  border: `4px solid ${rarityConfig.color}`,
                }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.3, 0] }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            )}

            <Card card={card} isFlipped={true} />

            {/* Shine effect sweeping across card */}
            {phase === "cardGrow" && (
              <motion.div
                className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                    width: "50%",
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Star burst particles for legendary */}
      <AnimatePresence>
        {phase === "celebration" && card.rarity === "legendary" && (
          <>
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute text-3xl pointer-events-none"
                style={{
                  left: "50%",
                  top: "50%",
                }}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.5, 1, 0],
                  x: Math.cos((i / 30) * Math.PI * 2) * (200 + Math.random() * 100),
                  y: Math.sin((i / 30) * Math.PI * 2) * (200 + Math.random() * 100),
                  rotate: Math.random() * 720,
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.03,
                  ease: "easeOut",
                }}
              >
                ✨
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Final rarity announcement overlay */}
      <AnimatePresence>
        {phase === "celebration" && (card.rarity === "rare" || card.rarity === "legendary") && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{
              scale: [0, 1.2, 1],
              opacity: [0, 1, 1, 0],
              y: [50, 0, 0, -20],
            }}
            transition={{ duration: 2 }}
          >
            <span
              className="font-serif text-5xl font-bold px-8 py-4 rounded-2xl"
              style={{
                color: rarityConfig.color,
                textShadow: `0 0 20px ${rarityConfig.color}, 0 0 40px ${rarityConfig.color}`,
                background: `linear-gradient(135deg, ${rarityConfig.bgColor} 0%, rgba(255,255,255,0.9) 100%)`,
              }}
            >
              {card.rarity === "legendary" ? "⭐ LEGENDARY! ⭐" : "💎 RARE! 💎"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CardDeckRevealProps {
  cards: ExperienceCard[];
  currentIndex: number;
  onReveal: (index: number) => void;
  onNext: () => void;
}

export function CardDeckReveal({
  cards,
  currentIndex,
  onReveal,
  onNext,
}: CardDeckRevealProps) {
  const currentCard = cards[currentIndex];
  const [isRevealed, setIsRevealed] = useState(false);

  const handleComplete = () => {
    setIsRevealed(true);
    onReveal(currentIndex);
  };

  const handleNext = () => {
    setIsRevealed(false);
    onNext();
  };

  return (
    <div className="relative">
      <CardReveal
        key={currentCard.id}
        card={currentCard}
        onComplete={handleComplete}
      />

      {/* Navigation */}
      <AnimatePresence>
        {isRevealed && currentIndex < cards.length - 1 && (
          <motion.button
            className="mt-8 mx-auto block px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full font-medium shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
          >
            Next Card ({currentIndex + 2}/{cards.length})
          </motion.button>
        )}
      </AnimatePresence>

      {/* All cards revealed */}
      <AnimatePresence>
        {isRevealed && currentIndex === cards.length - 1 && (
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-serif text-xl text-[#2C1810] mb-2">
              All cards revealed!
            </p>
            <p className="text-sm text-[#6B5344]">
              More adventures await on January 29th
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mt-6">
        {cards.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx < currentIndex
                ? "bg-[#C9A227]"
                : idx === currentIndex
                ? "bg-[#E07B39]"
                : "bg-[#E5DDD5]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
