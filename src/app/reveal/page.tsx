"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { CardReveal } from "@/components/CardReveal";
import { Card } from "@/components/Card";
import { DEMO_CARDS } from "@/data/demo-cards";
import { ArrowLeft, MapPin, Lock, Calendar } from "lucide-react";
import { ExperienceCard } from "@/types";

// Trip start date: January 29, 2026 (for demo)
// Change to 2025 for actual trip
const TRIP_START = new Date("2026-01-29");

function getCurrentWeek(): number {
  const now = new Date();
  const diffTime = now.getTime() - TRIP_START.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Before trip starts = week 0 (demo mode: show week 1)
  if (diffDays < 0) return 1; // Demo: allow week 1 card

  // During trip: week 1, 2, 3, etc.
  return Math.floor(diffDays / 7) + 1;
}

function getDaysUntilNextWeek(): number {
  const now = new Date();
  const currentWeek = getCurrentWeek();
  const nextWeekStart = new Date(TRIP_START);
  nextWeekStart.setDate(nextWeekStart.getDate() + currentWeek * 7);

  const diffTime = nextWeekStart.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export default function RevealPage() {
  const [currentWeek, setCurrentWeek] = useState(1); // Default to week 1
  const [revealedWeeks, setRevealedWeeks] = useState<number[]>([]);
  const [daysUntilNext, setDaysUntilNext] = useState(39); // Days until Jan 29
  const [isClient, setIsClient] = useState(false);

  // Calculate on client side only to avoid SSR mismatch
  useEffect(() => {
    setIsClient(true);
    setCurrentWeek(getCurrentWeek());
    setDaysUntilNext(getDaysUntilNextWeek());

    const timer = setInterval(() => {
      setDaysUntilNext(getDaysUntilNextWeek());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Get cards available for current week
  const availableCards = DEMO_CARDS.filter((c) => (c.weekNumber ?? 0) <= currentWeek);
  const currentWeekCard = DEMO_CARDS.find((c) => c.weekNumber === currentWeek);
  const isCurrentWeekRevealed = revealedWeeks.includes(currentWeek);

  const handleReveal = () => {
    if (currentWeekCard && !isCurrentWeekRevealed) {
      setRevealedWeeks((prev) => [...prev, currentWeek]);
    }
  };

  return (
    <main className="min-h-screen flex flex-col px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </Link>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#E07B39]/10 to-[#C9A227]/10 rounded-full">
          <MapPin className="w-4 h-4 text-[#E07B39]" />
          <span className="text-sm font-medium text-[#2C1810]">Cape Town</span>
        </div>
      </header>

      {/* Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">
          Week {currentWeek} Card
        </h1>
        <p className="text-[#6B5344]">
          {revealedWeeks.length} of {DEMO_CARDS.length} experiences revealed
        </p>
      </motion.div>

      {/* Card reveal area */}
      <div className="flex-1 flex items-center justify-center">
        {currentWeekCard ? (
          <AnimatePresence mode="wait">
            {!isCurrentWeekRevealed ? (
              <motion.div
                key="unrevealed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <CardReveal card={currentWeekCard} onComplete={handleReveal} />
              </motion.div>
            ) : (
              <motion.div
                key="revealed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                {/* Show the revealed card (front side) */}
                <Card card={currentWeekCard} isFlipped={true} />

                {/* Next card info */}
                <motion.div
                  className="mt-8 p-6 bg-white/80 rounded-2xl shadow-sm max-w-sm mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-center gap-2 text-[#6B5344] mb-3">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">Next Card</span>
                  </div>

                  {currentWeek < DEMO_CARDS.length ? (
                    <>
                      <p className="text-2xl font-serif text-[#2C1810] mb-1">
                        {daysUntilNext} days
                      </p>
                      <p className="text-sm text-[#6B5344]">
                        until Week {currentWeek + 1} unlocks
                      </p>
                    </>
                  ) : (
                    <p className="text-[#6B5344]">
                      All cards revealed! Enjoy your trip!
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <motion.div
            className="text-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Lock className="w-12 h-12 text-[#C9A227] mx-auto mb-4" />
            <h2 className="font-serif text-xl text-[#2C1810] mb-2">
              No Cards Yet
            </h2>
            <p className="text-[#6B5344]">
              Your first card unlocks on January 29, 2025
            </p>
          </motion.div>
        )}
      </div>

      {/* Week progress */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-center text-sm text-[#6B5344] mb-4">Your Journey</p>
        <div className="flex justify-center gap-3">
          {DEMO_CARDS.map((card, idx) => {
            const weekNum = card.weekNumber ?? 0;
            const isUnlocked = weekNum <= currentWeek;
            const isRevealed = revealedWeeks.includes(weekNum);
            const isCurrent = weekNum === currentWeek;

            return (
              <div
                key={card.id}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  isRevealed
                    ? "bg-gradient-to-br from-[#E07B39] to-[#C9A227] text-white"
                    : isCurrent
                    ? "bg-white border-2 border-[#C9A227] text-[#C9A227]"
                    : isUnlocked
                    ? "bg-white border border-[#E5DDD5] text-[#6B5344]"
                    : "bg-[#E5DDD5] text-[#6B5344]/50"
                }`}
              >
                {isUnlocked ? (
                  weekNum
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </main>
  );
}
