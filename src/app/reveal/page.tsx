"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { CardDeckReveal } from "@/components/CardReveal";
import { DEMO_CARDS } from "@/data/demo-cards";
import { ArrowLeft, MapPin } from "lucide-react";

export default function RevealPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);

  const handleReveal = (index: number) => {
    setRevealedCards((prev) => [...prev, index]);
  };

  const handleNext = () => {
    if (currentIndex < DEMO_CARDS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
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
          <span className="text-sm font-medium text-[#2C1810]">Cape Town Preview</span>
        </div>
      </header>

      {/* Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">
          Your Cape Town Cards
        </h1>
        <p className="text-[#6B5344]">
          {revealedCards.length} of {DEMO_CARDS.length} revealed
        </p>
      </motion.div>

      {/* Card reveal area */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <CardDeckReveal
              cards={DEMO_CARDS}
              currentIndex={currentIndex}
              onReveal={handleReveal}
              onNext={handleNext}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick stats */}
      <motion.div
        className="mt-8 flex justify-center gap-6 text-sm text-[#6B5344]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-400" />
          <span>Common: {DEMO_CARDS.filter((c) => c.rarity === "common").length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Uncommon: {DEMO_CARDS.filter((c) => c.rarity === "uncommon").length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Rare: {DEMO_CARDS.filter((c) => c.rarity === "rare").length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#C9A227]" />
          <span>Legendary: {DEMO_CARDS.filter((c) => c.rarity === "legendary").length}</span>
        </div>
      </motion.div>
    </main>
  );
}
