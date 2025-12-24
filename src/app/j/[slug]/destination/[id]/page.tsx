"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Lock,
  Sparkles,
  Eye,
  Clock,
  Heart,
} from "lucide-react";
import { CATEGORY_CONFIG, getThemeColors } from "@/types";
import { useJourneyAuth } from "@/hooks/useJourneyAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ExperienceReveal } from "@/components/ExperienceReveal";

interface Card {
  id: string;
  name: string;
  description: string;
  category: string | null;
  rarity: string | null;
  is_revealed: boolean;
  picture_url: string | null;
  estimated_cost: string | null;
  duration_hours: number | null;
  reveal_date: string | null;
  experience_date: string | null;
  order_index: number;
}

interface CardQuotaState {
  isRevealed: boolean;
  canReveal: boolean;
}

interface NextDestination {
  id: string;
  name: string;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  card_count: number;
}

interface QuotaInfo {
  revealsPerWeek: number;
  revealsThisWeek: number;
  revealsRemaining: number;
}

interface DestinationData {
  id: string;
  name: string;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  theme_colors: { primary?: string; secondary?: string } | null;
  cards: Card[];
  journey_name: string;
  cardsQuotaState: Record<string, CardQuotaState>;
  quotaInfo: QuotaInfo;
  nextDestination: NextDestination | null;
}

const RARITY_STYLES: Record<string, { bg: string; text: string; glow: string }> = {
  common: { bg: "bg-gray-100", text: "text-gray-600", glow: "" },
  uncommon: { bg: "bg-emerald-100", text: "text-emerald-600", glow: "" },
  rare: { bg: "bg-blue-100", text: "text-blue-600", glow: "shadow-blue-200" },
  legendary: { bg: "bg-amber-100", text: "text-amber-600", glow: "shadow-amber-200 shadow-lg" },
};

export default function DestinationPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const destinationId = params.id as string;

  const [destination, setDestination] = useState<DestinationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealingCard, setRevealingCard] = useState<Card | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(Math.random());

  const { isAuthenticated, isLoading: authLoading } = useJourneyAuth({ slug });

  // Fetch destination data
  useEffect(() => {
    async function fetchDestination() {
      try {
        const res = await fetch(`/api/journey/${slug}/destination/${destinationId}`);
        if (res.ok) {
          const data = await res.json();
          setDestination(data);
          // Force new shuffle when data is fetched
          setShuffleSeed(Math.random());
        }
      } catch {
        // Error fetching
      } finally {
        setLoading(false);
      }
    }
    fetchDestination();
  }, [slug, destinationId]);

  const handleRevealClick = (card: Card) => {
    setRevealingCard(card);
    setShowReveal(true);
  };

  const handleRevealComplete = async () => {
    if (!revealingCard) return;

    setError(null);
    try {
      const res = await fetch(`/api/journey/${slug}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: revealingCard.id }),
      });

      const data = await res.json();

      if (res.ok) {
        // Update local state
        setDestination((prev) =>
          prev
            ? {
                ...prev,
                cards: prev.cards.map((c) =>
                  c.id === revealingCard.id ? { ...c, is_revealed: true } : c
                ),
                cardsQuotaState: {
                  ...prev.cardsQuotaState,
                  [revealingCard.id]: {
                    isRevealed: true,
                    canReveal: false,
                  },
                },
              }
            : null
        );

        // Close reveal modal after a short delay
        setTimeout(() => {
          setShowReveal(false);
          setRevealingCard(null);
        }, 1500);
      } else {
        // Show error message
        setShowReveal(false);
        setRevealingCard(null);
        setError(data.error || "Failed to reveal card");
      }
    } catch (e) {
      setShowReveal(false);
      setRevealingCard(null);
      setError("Failed to reveal card. Please try again.");
    }
  };

  // Get card quota state (server-provided)
  const getCardQuotaState = (cardId: string): CardQuotaState | null => {
    return destination?.cardsQuotaState?.[cardId] || null;
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  const formatTimeUntilReveal = (revealDate: string) => {
    const reveal = new Date(revealDate);
    const now = new Date();
    const diffMs = reveal.getTime() - now.getTime();

    if (diffMs <= 0) return null;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  const formatRevealDate = (revealDate: string) => {
    const reveal = new Date(revealDate);
    const now = new Date();
    const diffMs = reveal.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;

    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return "In 1 week";
    return `In ${weeks} weeks`;
  };

  const formatDaysUntil = (date: string) => {
    const targetDate = new Date(date);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Starting soon";
    if (diffDays === 1) return "Starts in 1 day";
    if (diffDays < 7) return `Starts in ${diffDays} days`;

    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return "Starts in 1 week";
    return `Starts in ${weeks} weeks`;
  };

  // Fisher-Yates shuffle algorithm - memoized with shuffle seed
  // MUST be before early returns (Rules of Hooks)
  const cardChoices = useMemo(() => {
    if (!destination) return [];

    const hiddenCards = destination.cards.filter((c) => !c.is_revealed);
    const revealableCards = hiddenCards.filter((card) => {
      const state = destination.cardsQuotaState?.[card.id];
      return state?.canReveal ?? false;
    });

    if (revealableCards.length === 0) return [];

    const cards = [...revealableCards];

    // Fisher-Yates shuffle - truly random
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    // Return ALL shuffled cards (all revealable cards if quota available)
    return cards;
  }, [destination, shuffleSeed]);

  const getColors = () => getThemeColors(destination?.theme_colors);

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  if (!destination) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
        <p className="text-[#6B5344]">Destination not found</p>
      </main>
    );
  }

  const colors = getColors();
  const revealedCards = destination.cards.filter((c) => c.is_revealed);
  const hiddenCards = destination.cards.filter((c) => !c.is_revealed);

  // Separate locked cards into time-locked vs other
  const now = new Date();
  const timeLockedCards = hiddenCards.filter((card) => {
    if (!card.reveal_date) return false;
    const revealDate = new Date(card.reveal_date);
    return revealDate > now;
  }).sort((a, b) => {
    const dateA = new Date(a.reveal_date!).getTime();
    const dateB = new Date(b.reveal_date!).getTime();
    return dateA - dateB;
  });

  const quotaLockedCards = hiddenCards.filter((card) => {
    const state = getCardQuotaState(card.id);
    if (!card.reveal_date) return false;
    const revealDate = new Date(card.reveal_date);
    return revealDate <= now && !state?.canReveal && !card.is_revealed;
  });

  const otherLockedCards = hiddenCards.filter((card) => {
    return !card.reveal_date && !card.is_revealed;
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6] px-6 py-8">
      {/* Back button */}
      <motion.button
        onClick={() => router.push(`/j/${slug}/journey`)}
        className="flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to journey
      </motion.button>

      {/* Header */}
      <motion.header
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <MapPin className="w-6 h-6" style={{ color: colors.primary }} />
          <h1 className="font-serif text-3xl text-[#2C1810]">{destination.name}</h1>
        </div>
        {destination.country && (
          <p className="text-[#6B5344] mb-2">{destination.country}</p>
        )}
        <div className="flex items-center justify-center gap-2 text-sm text-[#6B5344]">
          <Calendar className="w-4 h-4" />
          <span>{formatDateRange(destination.start_date, destination.end_date)}</span>
        </div>
      </motion.header>

      {/* Error message */}
      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      {/* Available cards to reveal */}
      {cardChoices.length > 0 && (
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="font-serif text-xl text-[#2C1810] mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: colors.primary }} />
              Available Now
            </h2>
            <p className="text-sm text-[#6B5344]">
              {cardChoices.length === 1
                ? `1 mystery experience • ${destination.quotaInfo.revealsRemaining} reveal${destination.quotaInfo.revealsRemaining === 1 ? '' : 's'} remaining this week`
                : `${cardChoices.length} mystery experiences • ${destination.quotaInfo.revealsRemaining} reveal${destination.quotaInfo.revealsRemaining === 1 ? '' : 's'} remaining`}
            </p>
          </div>

          <div className={`grid gap-4 ${cardChoices.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
            {cardChoices.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => handleRevealClick(card)}
                disabled={revealingCard !== null}
                className="relative overflow-hidden rounded-2xl text-left w-full cursor-pointer hover:shadow-lg transition-shadow bg-white border-2"
                style={{
                  borderColor: colors.primary,
                }}
              >
                <div
                  className="p-6"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}08)`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
                        }}
                      >
                        <Sparkles
                          className="w-7 h-7"
                          style={{ color: colors.primary }}
                        />
                      </div>

                      <div>
                        <p className="font-serif text-lg text-[#2C1810] mb-1">
                          Mystery Experience
                        </p>
                        <p className="text-sm text-[#6B5344]">
                          Tap to reveal
                        </p>
                      </div>
                    </div>

                    <div
                      className="px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      }}
                    >
                      Reveal
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* No cards available message */}
      {cardChoices.length === 0 && hiddenCards.length > 0 && (
        <section className="mb-10">
          <div
            className="rounded-2xl p-6 border-2 text-center"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}08)`,
              borderColor: colors.primary,
            }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: `${colors.primary}20` }}
            >
              <Clock className="w-8 h-8" style={{ color: colors.primary }} />
            </div>
            <h3 className="font-serif text-xl text-[#2C1810] mb-2">
              {destination.quotaInfo.revealsRemaining === 0
                ? "Weekly Quota Reached"
                : "More Experiences Coming Soon"}
            </h3>
            <p className="text-sm text-[#6B5344]">
              {destination.quotaInfo.revealsRemaining === 0
                ? `You've revealed ${destination.quotaInfo.revealsThisWeek} of ${destination.quotaInfo.revealsPerWeek} cards this week • New cards unlock each week`
                : `New mystery cards will unlock each week • ${destination.quotaInfo.revealsPerWeek} reveals per week`}
            </p>
          </div>
        </section>
      )}

      {/* Time-locked cards - unlocking soon */}
      {timeLockedCards.length > 0 && (
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="font-serif text-xl text-[#2C1810] mb-1 flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: colors.primary }} />
              Unlocking Soon
            </h2>
            <p className="text-sm text-[#6B5344]">
              {timeLockedCards.length} experience{timeLockedCards.length === 1 ? '' : 's'} scheduled to unlock
            </p>
          </div>
          <div className="grid gap-3">
            {timeLockedCards.slice(0, 5).map((card, idx) => {
              const timeUntil = card.reveal_date ? formatTimeUntilReveal(card.reveal_date) : null;
              const revealDateText = card.reveal_date ? formatRevealDate(card.reveal_date) : null;

              return (
                <motion.div
                  key={card.id}
                  className="relative overflow-hidden rounded-xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div
                    className="p-4 border-2 flex items-center justify-between"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}05, ${colors.secondary}05)`,
                      borderColor: `${colors.primary}30`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: `${colors.primary}15` }}
                      >
                        <Clock className="w-5 h-5" style={{ color: colors.primary }} />
                      </div>
                      <div>
                        <p className="font-medium text-[#2C1810] text-sm">Mystery Experience</p>
                        <p className="text-xs text-[#6B5344]">
                          {revealDateText}
                        </p>
                      </div>
                    </div>
                    {timeUntil && (
                      <div
                        className="px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{
                          background: `${colors.primary}20`,
                          color: colors.primary,
                        }}
                      >
                        {timeUntil}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {timeLockedCards.length > 5 && (
              <p className="text-sm text-[#6B5344] text-center py-2">
                +{timeLockedCards.length - 5} more unlocking later
              </p>
            )}
          </div>
        </section>
      )}

      {/* Quota-locked cards - waiting for weekly quota */}
      {quotaLockedCards.length > 0 && cardChoices.length === 0 && (
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="font-serif text-xl text-[#2C1810] mb-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#6B5344]" />
              Waiting for Quota
            </h2>
            <p className="text-sm text-[#6B5344]">
              {quotaLockedCards.length} experience{quotaLockedCards.length === 1 ? '' : 's'} ready but weekly quota reached
            </p>
          </div>
          <div className="grid gap-3">
            {quotaLockedCards.slice(0, 3).map((card, idx) => (
              <motion.div
                key={card.id}
                className="relative overflow-hidden rounded-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div
                  className="p-4 border border-[#E5DDD5] flex items-center justify-between"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}05, ${colors.secondary}05)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${colors.primary}10` }}
                    >
                      <Lock className="w-4 h-4 text-[#6B5344]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#2C1810] text-sm">Mystery Experience</p>
                      <p className="text-xs text-[#6B5344]">Available next week</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Next Destination Preview */}
      {destination.nextDestination && (
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="rounded-2xl p-6 border-2"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}08)`,
              borderColor: colors.primary,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${colors.primary}20` }}
              >
                <MapPin className="w-7 h-7" style={{ color: colors.primary }} />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-[#2C1810] mb-1">
                  Next Destination
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-semibold text-lg" style={{ color: colors.primary }}>
                    {destination.nextDestination.name}
                  </h4>
                  {destination.nextDestination.country && (
                    <span className="text-sm text-[#6B5344]">
                      {destination.nextDestination.country}
                    </span>
                  )}
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 text-[#6B5344]">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDateRange(
                        destination.nextDestination.start_date,
                        destination.nextDestination.end_date
                      )}
                    </span>
                  </div>

                  {destination.nextDestination.start_date && (
                    <div className="flex items-center gap-2 text-[#6B5344]">
                      <Clock className="w-4 h-4" />
                      <span>{formatDaysUntil(destination.nextDestination.start_date)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className="px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        background: `${colors.primary}20`,
                        color: colors.primary,
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                      {destination.nextDestination.card_count} new experiences
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#6B5344] mt-4 italic">
                  Continue your journey with new experiences in {destination.nextDestination.name}
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Revealed cards */}
      {revealedCards.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="font-serif text-xl text-[#2C1810] mb-1 flex items-center gap-2">
              <Heart className="w-5 h-5" style={{ color: colors.primary }} />
              Your Collection
            </h2>
            <p className="text-sm text-[#6B5344]">
              {revealedCards.length} experience{revealedCards.length === 1 ? '' : 's'} revealed
            </p>
          </div>
          <div className="grid gap-4">
            <AnimatePresence>
              {revealedCards.map((card, idx) => {
                const rarity = card.rarity || "common";
                const styles = RARITY_STYLES[rarity] || RARITY_STYLES.common;
                const categoryConfig = card.category ? CATEGORY_CONFIG[card.category as keyof typeof CATEGORY_CONFIG] : null;
                const icon = categoryConfig?.icon || "✨";

                return (
                  <motion.button
                    key={card.id}
                    onClick={() => router.push(`/j/${slug}/card/${card.id}`)}
                    className={`text-left overflow-hidden rounded-2xl bg-white shadow-sm border border-[#E5DDD5] hover:shadow-md transition-shadow ${styles.glow}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex">
                      {/* Image or icon */}
                      <div
                        className="w-24 h-24 flex-shrink-0 flex items-center justify-center text-3xl"
                        style={{
                          background: card.picture_url
                            ? `url(${card.picture_url}) center/cover`
                            : `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
                        }}
                      >
                        {!card.picture_url && icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-medium text-[#2C1810] line-clamp-1">
                            {card.name}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
                            {rarity}
                          </span>
                        </div>
                        <p className="text-sm text-[#6B5344] line-clamp-2">
                          {card.description}
                        </p>
                        {card.duration_hours && (
                          <div className="flex items-center gap-3 mt-2 text-xs text-[#6B5344]">
                            <span>{card.duration_hours}h</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Empty state */}
      {destination.cards.length === 0 && (
        <section className="text-center py-16">
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: `${colors.primary}20` }}
          >
            <Sparkles className="w-10 h-10" style={{ color: colors.primary }} />
          </div>
          <h2 className="font-serif text-2xl text-[#2C1810] mb-2">
            Experiences Coming Soon
          </h2>
          <p className="text-[#6B5344]">
            Your curator is preparing something special
          </p>
        </section>
      )}

      {/* Reveal Modal */}
      {showReveal && revealingCard && (
        <ExperienceReveal
          card={revealingCard}
          themeColors={colors}
          onComplete={handleRevealComplete}
          onClose={() => {
            setShowReveal(false);
            setRevealingCard(null);
          }}
        />
      )}
    </main>
  );
}
