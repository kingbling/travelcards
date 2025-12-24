"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Heart,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Chapter, Card as CardType, Destination } from "@/types/database";
import { Card } from "@/components/Card";
import { CardReveal } from "@/components/CardReveal";
import { RARITY_CONFIG, getRarityConfig } from "@/types/database";
import { ExperienceCard, Category, TargetProfile, Rarity } from "@/types";
import { useJourneyAuth } from "@/hooks/useJourneyAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface ChapterData extends Chapter {
  destination: Destination;
  cards: CardType[];
}

// Convert database card to ExperienceCard for components
function toExperienceCard(card: CardType, destinationColors: { primary: string; secondary: string }): ExperienceCard {
  return {
    id: card.id,
    name: card.name,
    description: card.description || "",
    category: (card.category || "adventure") as Category,
    targetProfile: (card.target_profile || "family") as TargetProfile,
    rarity: (card.rarity || "common") as Rarity,
    estimatedCost: card.estimated_cost || undefined,
    currency: card.currency || undefined,
    durationHours: card.duration_hours || undefined,
    bookingUrl: card.booking_url || undefined,
    personalNote: card.personal_note || undefined,
    weekNumber: 1,
    destination: "",
    themeColors: destinationColors,
  };
}

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const chapterId = params.id as string;

  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealingCard, setRevealingCard] = useState<CardType | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);

  const { isAuthenticated, isLoading: authLoading } = useJourneyAuth({ slug });

  // Fetch chapter data
  const fetchChapter = useCallback(async () => {
    try {
      const res = await fetch(`/api/journey/${slug}/chapter/${chapterId}`);
      if (res.ok) {
        const data = await res.json();
        setChapter(data);

        // Calculate cooldown
        const lastReveal = data.cards.find((c: CardType) => c.is_revealed)?.revealed_at;
        if (lastReveal && data.reveal_cooldown_hours) {
          const lastRevealTime = new Date(lastReveal).getTime();
          const cooldownEnd = lastRevealTime + data.reveal_cooldown_hours * 60 * 60 * 1000;
          const remaining = cooldownEnd - Date.now();
          if (remaining > 0) {
            setCooldownRemaining(remaining);
          }
        }
      }
    } catch {
      // Error fetching chapter
    } finally {
      setLoading(false);
    }
  }, [slug, chapterId]);

  useEffect(() => {
    fetchChapter();
  }, [fetchChapter]);

  // Update cooldown timer
  useEffect(() => {
    if (cooldownRemaining === null || cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev === null || prev <= 1000) return null;
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const formatCooldown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  const handleRevealCard = async (card: CardType) => {
    if (card.is_revealed || cooldownRemaining) return;
    setRevealingCard(card);
  };

  const handleRevealComplete = async () => {
    if (!revealingCard) return;

    try {
      await fetch(`/api/journey/${slug}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: revealingCard.id }),
      });

      // Refresh chapter data
      await fetchChapter();
    } catch {
      // Error revealing card
    }

    setRevealingCard(null);
  };

  const getThemeColors = () => {
    const colors = chapter?.destination.theme_colors as { primary?: string; secondary?: string } | null;
    return {
      primary: colors?.primary || "#E07B39",
      secondary: colors?.secondary || "#C9A227",
    };
  };

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  if (!chapter) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
        <p className="text-[#6B5344]">Chapter not found</p>
      </main>
    );
  }

  const colors = getThemeColors();
  const revealedCards = chapter.cards.filter((c) => c.is_revealed);
  const unrevealedCards = chapter.cards.filter((c) => !c.is_revealed);
  const canReveal = !cooldownRemaining && unrevealedCards.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6] px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push(`/j/${slug}/journey`)}
          className="flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: `${colors.primary}15` }}
        >
          <span className="text-sm font-medium" style={{ color: colors.primary }}>
            {chapter.destination.name}
          </span>
        </div>
      </header>

      {/* Chapter title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">
          {chapter.name}
        </h1>
        {chapter.description && (
          <p className="text-[#6B5344] max-w-md mx-auto">{chapter.description}</p>
        )}
      </motion.div>

      {/* Progress */}
      <motion.div
        className="flex items-center justify-center gap-4 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: colors.primary }} />
          <span className="text-sm text-[#6B5344]">
            {revealedCards.length} of {chapter.cards.length} revealed
          </span>
        </div>

        {cooldownRemaining && (
          <div className="flex items-center gap-2 text-[#6B5344]">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Next reveal in {formatCooldown(cooldownRemaining)}
            </span>
          </div>
        )}
      </motion.div>

      {/* Card reveal modal */}
      <AnimatePresence>
        {revealingCard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CardReveal
              card={toExperienceCard(revealingCard, colors)}
              onComplete={handleRevealComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards grid */}
      <div className="max-w-2xl mx-auto">
        {/* Unrevealed cards */}
        {unrevealedCards.length > 0 && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-sm font-medium text-[#6B5344] mb-4 uppercase tracking-wider">
              Ready to Reveal
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {unrevealedCards.slice(0, canReveal ? 1 : 0).map((card) => (
                <motion.button
                  key={card.id}
                  onClick={() => handleRevealCard(card)}
                  className="relative aspect-[3/4] bg-gradient-to-br from-white to-[#FAF0E6] rounded-xl border-2 border-dashed border-[#C9A227] flex flex-col items-center justify-center p-4 hover:shadow-lg transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="text-[#C9A227]"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-8 h-8" />
                  </motion.div>
                  <p className="mt-3 text-sm font-medium text-[#6B5344]">
                    Tap to Reveal
                  </p>
                </motion.button>
              ))}

              {/* Locked cards */}
              {unrevealedCards.slice(canReveal ? 1 : 0).map((card, idx) => (
                <div
                  key={card.id}
                  className="relative aspect-[3/4] bg-[#E5DDD5]/50 rounded-xl border border-[#E5DDD5] flex flex-col items-center justify-center p-4 opacity-50"
                >
                  <Clock className="w-6 h-6 text-[#6B5344]" />
                  <p className="mt-2 text-xs text-[#6B5344]">
                    {cooldownRemaining ? "Cooldown active" : `Card ${idx + 2}`}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Revealed cards */}
        {revealedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-sm font-medium text-[#6B5344] mb-4 uppercase tracking-wider">
              Your Cards
            </h2>
            <div className="space-y-4">
              {revealedCards.map((card) => (
                <motion.div
                  key={card.id}
                  className="bg-white rounded-xl shadow-sm border border-[#E5DDD5] p-4"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: getRarityConfig(card.rarity).bgColor,
                            color: getRarityConfig(card.rarity).color,
                          }}
                        >
                          {getRarityConfig(card.rarity).label}
                        </span>
                        {card.category && (
                          <span className="text-xs text-[#6B5344]">
                            {card.category}
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif text-lg text-[#2C1810] mb-1">
                        {card.name}
                      </h3>
                      {card.description && (
                        <p className="text-sm text-[#6B5344] line-clamp-2">
                          {card.description}
                        </p>
                      )}
                    </div>

                    {card.booking_url && (
                      <a
                        href={card.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
                        style={{
                          backgroundColor: `${colors.primary}15`,
                          color: colors.primary,
                        }}
                      >
                        Book
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {card.personal_note && (
                    <div
                      className="mt-3 p-3 rounded-lg italic text-sm"
                      style={{ backgroundColor: `${colors.secondary}10` }}
                    >
                      <Heart
                        className="w-3 h-3 inline-block mr-1"
                        style={{ color: colors.secondary }}
                      />
                      &ldquo;{card.personal_note}&rdquo;
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-[#6B5344]">
                    {card.duration_hours && (
                      <span>
                        <Clock className="w-3 h-3 inline-block mr-1" />
                        {card.duration_hours}h
                      </span>
                    )}
                    {card.estimated_cost && (
                      <span>
                        {card.currency} {card.estimated_cost}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {chapter.cards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#6B5344]">No cards in this chapter yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
