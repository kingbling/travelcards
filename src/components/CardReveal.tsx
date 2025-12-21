"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExperienceCard, RARITY_CONFIG } from "@/types";
import { Card } from "./Card";
import { Sparkles } from "lucide-react";

interface CardRevealProps {
  card: ExperienceCard;
  onComplete?: () => void;
}

export function CardReveal({ card, onComplete }: CardRevealProps) {
  const [phase, setPhase] = useState<"intro" | "reveal" | "shown">("intro");
  const [showParticles, setShowParticles] = useState(false);
  const rarityConfig = RARITY_CONFIG[card.rarity];

  useEffect(() => {
    if (phase === "reveal") {
      setShowParticles(true);
      const timer = setTimeout(() => {
        setPhase("shown");
        setShowParticles(false);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  const handleReveal = () => {
    if (phase === "intro") {
      setPhase("reveal");
    }
  };

  return (
    <div className="relative w-full min-h-[600px] flex items-center justify-center">
      {/* Background glow effect */}
      <AnimatePresence>
        {phase === "reveal" && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${rarityConfig.color}40 0%, transparent 70%)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particles for legendary */}
      <AnimatePresence>
        {showParticles && card.rarity === "legendary" && (
          <>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-2xl pointer-events-none"
                initial={{
                  opacity: 0,
                  x: 0,
                  y: 0,
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  x: Math.cos((i / 20) * Math.PI * 2) * 150,
                  y: Math.sin((i / 20) * Math.PI * 2) * 150,
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
                style={{
                  left: "50%",
                  top: "50%",
                }}
              >
                ✨
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* The card */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card
          card={card}
          isFlipped={phase !== "intro"}
          onClick={handleReveal}
        />

        {/* Tap hint */}
        <AnimatePresence>
          {phase === "intro" && (
            <motion.div
              className="absolute -bottom-16 left-0 right-0 flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Sparkles className="w-5 h-5 text-[#C9A227]" />
              </motion.div>
              <span className="text-sm text-[#6B5344]">Tap to reveal</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rarity announcement for rare+ cards */}
        <AnimatePresence>
          {phase === "reveal" && (card.rarity === "rare" || card.rarity === "legendary") && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2 }}
            >
              <span
                className={`font-serif text-4xl font-bold ${
                  card.rarity === "legendary" ? "text-legendary" : "text-blue-500"
                }`}
              >
                {card.rarity === "legendary" ? "LEGENDARY!" : "RARE!"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
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
