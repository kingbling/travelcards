"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Sparkles,
  Clock,
  Heart,
  Gift,
} from "lucide-react";
import { CATEGORY_CONFIG, getThemeColors } from "@/types";
import { useJourneyAuth } from "@/hooks/useJourneyAuth";
import { useDestinationPhoto } from "@/hooks/useDestinationPhoto";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ExperienceReveal } from "@/components/ExperienceReveal";
import { TreatReveal } from "@/components/TreatReveal";

interface RevealedCard {
  id: string;
  name: string;
  description: string;
  category: string | null;
  rarity: string | null;
  picture_url: string | null;
  estimated_cost: string | null;
  duration_hours: number | null;
  experience_date: string | null;
  revealed_at: string | null;
}

interface RevealedTreat {
  id: string;
  name: string;
  description: string | null;
  estimated_cost?: string | null;
  revealed_at: string | null;
}

interface NextDestination {
  id: string;
  name: string;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface DestinationData {
  id: string;
  name: string;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  theme_colors: { primary?: string; secondary?: string } | null;
  journey_name: string;
  revealedCards: RevealedCard[];
  revealedTreats: RevealedTreat[];
  progress: {
    cards: { revealed: number; total: number };
    treats: { revealed: number; total: number };
  };
  nextDestination: NextDestination | null;
}

interface RevealStatus {
  cards: {
    canReveal: boolean;
    remaining: number;
    perWeek: number;
    available: number;
    nextResetTime: string;
    daysUntilReset: number;
    preview: { picture_url: string | null } | null;
  };
  treats: {
    canReveal: boolean;
    remaining: number;
    perWeek: number;
    available: number;
    unlocked: boolean;
    nextResetTime: string;
    daysUntilReset: number;
  };
}

// Only show rare and legendary badges
const RARITY_STYLES: Record<string, { bg: string; text: string; glow: string } | null> = {
  common: null,
  uncommon: null,
  rare: { bg: "bg-blue-100", text: "text-blue-600", glow: "shadow-blue-200" },
  legendary: { bg: "bg-amber-100", text: "text-amber-600", glow: "shadow-amber-200 shadow-lg" },
};

export default function DestinationPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const destinationId = params.id as string;

  const [destination, setDestination] = useState<DestinationData | null>(null);
  const [revealStatus, setRevealStatus] = useState<RevealStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState<"card" | "treat" | null>(null);
  const [revealedItem, setRevealedItem] = useState<RevealedCard | null>(null);
  const [revealedTreat, setRevealedTreat] = useState<RevealedTreat | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [showTreatReveal, setShowTreatReveal] = useState(false);
  const [viewingTreat, setViewingTreat] = useState<RevealedTreat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isLoading: authLoading } = useJourneyAuth({ slug });

  // Fetch destination photo (cached in DB after first fetch)
  const { photo: destinationPhoto } = useDestinationPhoto({
    destinationId: destinationId,
    width: 1200,
  });

  // Fetch destination data
  useEffect(() => {
    async function fetchData() {
      try {
        const [destRes, statusRes] = await Promise.all([
          fetch(`/api/journey/${slug}/destination/${destinationId}`),
          fetch(`/api/journey/${slug}/reveal-status?destinationId=${destinationId}`),
        ]);

        if (destRes.ok) {
          setDestination(await destRes.json());
        } else {
          setError("Failed to load destination");
        }

        if (statusRes.ok) {
          setRevealStatus(await statusRes.json());
        }
      } catch (err) {
        console.error("[DESTINATION] Error fetching data:", err);
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug, destinationId]);

  const handleRevealCard = async () => {
    setRevealing("card");
    setError(null);

    try {
      const res = await fetch(`/api/journey/${slug}/reveal/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationId }),
      });

      const data = await res.json();

      if (res.ok) {
        // Show reveal animation
        setRevealedItem(data.card);
        setShowReveal(true);

        // Update local state
        setDestination((prev) =>
          prev
            ? {
                ...prev,
                revealedCards: [data.card, ...prev.revealedCards],
                progress: {
                  ...prev.progress,
                  cards: {
                    ...prev.progress.cards,
                    revealed: prev.progress.cards.revealed + 1,
                  },
                },
              }
            : null
        );

        // Update reveal status
        setRevealStatus((prev) =>
          prev
            ? {
                ...prev,
                cards: {
                  ...prev.cards,
                  remaining: data.quota.remaining,
                  canReveal: data.quota.remaining > 0 && prev.cards.available > 1,
                  available: prev.cards.available - 1,
                },
                treats: {
                  ...prev.treats,
                  unlocked: true, // First card unlocks treats
                  canReveal: prev.treats.remaining > 0 && prev.treats.available > 0, // Enable treat reveal
                },
              }
            : null
        );
      } else {
        setError(data.error || "Failed to reveal");
      }
    } catch (err) {
      console.error("[DESTINATION] Reveal error:", err);
      setError("Failed to reveal. Please try again.");
    } finally {
      setRevealing(null);
    }
  };

  const handleRevealTreat = async () => {
    setRevealing("treat");
    setError(null);

    try {
      const res = await fetch(`/api/journey/${slug}/reveal/treat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationId }),
      });

      const data = await res.json();

      if (res.ok) {
        // Show reveal animation
        setRevealedTreat(data.treat);
        setShowTreatReveal(true);

        // Update local state
        setDestination((prev) =>
          prev
            ? {
                ...prev,
                revealedTreats: [data.treat, ...prev.revealedTreats],
                progress: {
                  ...prev.progress,
                  treats: {
                    ...prev.progress.treats,
                    revealed: prev.progress.treats.revealed + 1,
                  },
                },
              }
            : null
        );

        // Update reveal status
        setRevealStatus((prev) =>
          prev
            ? {
                ...prev,
                treats: {
                  ...prev.treats,
                  remaining: data.quota.remaining,
                  canReveal: data.quota.remaining > 0 && prev.treats.available > 1,
                  available: prev.treats.available - 1,
                },
              }
            : null
        );
      } else {
        setError(data.error || "Failed to reveal treat");
      }
    } catch (err) {
      console.error("[DESTINATION] Treat reveal error:", err);
      setError("Failed to reveal treat. Please try again.");
    } finally {
      setRevealing(null);
    }
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  const formatResetTime = (isoString: string) => {
    const reset = new Date(isoString);
    const now = new Date();
    const diffMs = reset.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `in ${diffDays} days`;
  };

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
      {/* Hero Image Section */}
      <motion.div
        className="relative h-64 md:h-80 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Background Image */}
        {destinationPhoto?.imageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${destinationPhoto.imageUrl})`,
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}40, ${colors.secondary}40)`,
            }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Back button */}
        <motion.button
          onClick={() => router.push(`/j/${slug}/journey`)}
          className="absolute top-6 left-6 flex items-center gap-2 text-white/90 hover:text-white bg-black/20 hover:bg-black/30 px-3 py-2 rounded-full backdrop-blur-sm transition-all"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        {/* Destination info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5" />
              <h1 className="font-serif text-3xl md:text-4xl">{destination.name}</h1>
            </div>
            {destination.country && (
              <p className="text-white/80 mb-2 text-lg">{destination.country}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Calendar className="w-4 h-4" />
              <span>{formatDateRange(destination.start_date, destination.end_date)}</span>
            </div>
          </motion.div>
        </div>

        {/* Photo attribution */}
        {destinationPhoto?.attribution && (
          <a
            href={destinationPhoto.attribution.link}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 text-[10px] text-white/50 hover:text-white/80 transition-colors"
          >
            {destinationPhoto.attribution.text}
          </a>
        )}
      </motion.div>

      <div className="px-6 py-8">

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

      {/* Reveal Actions */}
      {revealStatus && (
        <section className="mb-10 space-y-4">
          {/* Experience Reveal */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={handleRevealCard}
              disabled={!revealStatus.cards.canReveal || revealing !== null}
              className="relative w-full rounded-2xl border-2 text-left transition-all overflow-hidden disabled:cursor-not-allowed"
              style={{
                borderColor: revealStatus.cards.canReveal ? colors.primary : "#ddd",
              }}
            >
              {/* Background preview image */}
              {revealStatus.cards.preview?.picture_url && (
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `url(${revealStatus.cards.preview.picture_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(8px)",
                  }}
                />
              )}
              <div
                className="relative p-5"
                style={{
                  background: revealStatus.cards.canReveal
                    ? `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`
                    : "rgba(245,245,245,0.9)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{
                        background: revealStatus.cards.canReveal
                          ? `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}30)`
                          : "#eee",
                      }}
                    >
                      <Sparkles
                        className="w-7 h-7"
                        style={{ color: revealStatus.cards.canReveal ? colors.primary : "#999" }}
                      />
                    </div>
                    <div>
                      <p className="font-serif text-lg text-[#2C1810]">
                        {revealing === "card" ? "Revealing..." : "Reveal Experience"}
                      </p>
                      <p className="text-sm text-[#6B5344]">
                        {revealStatus.cards.canReveal ? (
                          <>{revealStatus.cards.remaining} of {revealStatus.cards.perWeek} this week</>
                        ) : revealStatus.cards.remaining === 0 ? (
                          <>Next week: {revealStatus.cards.perWeek} new reveals</>
                        ) : (
                          <>No experiences available</>
                        )}
                      </p>
                    </div>
                  </div>
                  {revealStatus.cards.canReveal && (
                    <div
                      className="px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      }}
                    >
                      Reveal
                    </div>
                  )}
                </div>
              </div>
            </button>
          </motion.div>

          {/* Treat Reveal */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              onClick={handleRevealTreat}
              disabled={!revealStatus.treats.canReveal || revealing !== null}
              className="w-full p-5 rounded-2xl border-2 text-left transition-all disabled:cursor-not-allowed"
              style={{
                background: revealStatus.treats.canReveal
                  ? `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}10)`
                  : "#f5f5f5",
                borderColor: revealStatus.treats.canReveal ? colors.primary : "#ddd",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: revealStatus.treats.canReveal
                        ? `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`
                        : "#eee",
                    }}
                  >
                    <Gift
                      className="w-7 h-7"
                      style={{ color: revealStatus.treats.canReveal ? colors.primary : "#999" }}
                    />
                  </div>
                  <div>
                    <p className="font-serif text-lg text-[#2C1810]">
                      {revealing === "treat" ? "Revealing..." : "Reveal Treat"}
                    </p>
                    <p className="text-sm text-[#6B5344]">
                      {!revealStatus.treats.unlocked ? (
                        "Unlock by revealing your first experience"
                      ) : revealStatus.treats.canReveal ? (
                        <>{revealStatus.treats.remaining} of {revealStatus.treats.perWeek} this week</>
                      ) : revealStatus.treats.remaining === 0 ? (
                        <>Next week: {revealStatus.treats.perWeek} new treat{revealStatus.treats.perWeek > 1 ? "s" : ""}</>
                      ) : (
                        <>No treats available</>
                      )}
                    </p>
                  </div>
                </div>
                {revealStatus.treats.canReveal && (
                  <div
                    className="px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                    }}
                  >
                    Reveal
                  </div>
                )}
              </div>
            </button>
          </motion.div>

          {/* Progress */}
          <div className="text-center text-sm text-[#6B5344]">
            {destination.progress.cards.revealed} / {destination.progress.cards.total} experiences
            {destination.progress.treats.total > 0 && (
              <span> • {destination.progress.treats.revealed} / {destination.progress.treats.total} treats</span>
            )}
          </div>
        </section>
      )}

      {/* Revealed Treats */}
      {destination.revealedTreats.length > 0 && (
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="font-serif text-xl text-[#2C1810] mb-1 flex items-center gap-2">
              <Gift className="w-5 h-5" style={{ color: colors.primary }} />
              Your Treats
            </h2>
          </div>
          <div className="grid gap-3">
            {destination.revealedTreats.map((treat) => (
              <motion.button
                key={treat.id}
                onClick={() => setViewingTreat(treat)}
                className="p-4 border-2 rounded-xl flex items-center gap-3 text-left hover:shadow-md transition-shadow"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}10)`,
                  borderColor: `${colors.primary}40`,
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${colors.primary}20` }}
                >
                  <Gift className="w-5 h-5" style={{ color: colors.primary }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#2C1810] text-sm">{treat.name}</p>
                  {treat.description && (
                    <p className="text-xs text-[#6B5344] line-clamp-2">{treat.description}</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Revealed Cards Collection */}
      {destination.revealedCards.length > 0 && (
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="font-serif text-xl text-[#2C1810] mb-1 flex items-center gap-2">
              <Heart className="w-5 h-5" style={{ color: colors.primary }} />
              Your Experiences
            </h2>
          </div>
          <div className="grid gap-4">
            <AnimatePresence>
              {destination.revealedCards.map((card, idx) => {
                const rarity = card.rarity || "common";
                const styles = RARITY_STYLES[rarity]; // null for common/uncommon
                const categoryConfig = card.category
                  ? CATEGORY_CONFIG[card.category as keyof typeof CATEGORY_CONFIG]
                  : null;
                const icon = categoryConfig?.icon || "✨";

                return (
                  <motion.button
                    key={card.id}
                    onClick={() => router.push(`/j/${slug}/card/${card.id}`)}
                    className={`text-left overflow-hidden rounded-2xl bg-white shadow-sm border border-[#E5DDD5] hover:shadow-md transition-shadow ${styles?.glow || ""}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex">
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
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-medium text-[#2C1810] line-clamp-1">
                            {card.name}
                          </h3>
                          {/* Only show badge for rare/legendary */}
                          {styles && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${styles.bg} ${styles.text}`}>
                              {rarity}
                            </span>
                          )}
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
      {destination.revealedCards.length === 0 && destination.revealedTreats.length === 0 && (
        <section className="text-center py-12">
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: `${colors.primary}20` }}
          >
            <Sparkles className="w-10 h-10" style={{ color: colors.primary }} />
          </div>
          <h2 className="font-serif text-2xl text-[#2C1810] mb-2">
            Start Your Adventure
          </h2>
          <p className="text-[#6B5344]">
            Tap "Reveal Experience" to discover your first surprise
          </p>
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
                <div className="flex items-center gap-2 text-sm text-[#6B5344]">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDateRange(
                      destination.nextDestination.start_date,
                      destination.nextDestination.end_date
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}
      </div>

      {/* Experience Reveal Modal */}
      {showReveal && revealedItem && (
        <ExperienceReveal
          card={revealedItem}
          themeColors={colors}
          onComplete={() => {
            setShowReveal(false);
            setRevealedItem(null);
          }}
          onClose={() => {
            setShowReveal(false);
            setRevealedItem(null);
          }}
        />
      )}

      {/* Treat Reveal Modal */}
      {showTreatReveal && revealedTreat && (
        <TreatReveal
          treat={revealedTreat}
          themeColors={colors}
          onComplete={() => {
            setShowTreatReveal(false);
            setRevealedTreat(null);
          }}
          onClose={() => {
            setShowTreatReveal(false);
            setRevealedTreat(null);
          }}
        />
      )}

      {/* View Treat Modal */}
      <AnimatePresence>
        {viewingTreat && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingTreat(null)}
          >
            <motion.div
              className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="py-8 flex flex-col items-center"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
                }}
              >
                <Gift className="w-16 h-16" style={{ color: colors.primary }} />
                <div
                  className="mt-3 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: `${colors.primary}20`,
                    color: colors.primary,
                  }}
                >
                  Your Treat
                </div>
              </div>

              {/* Content */}
              <div className="p-6 text-center">
                <h3 className="font-serif text-2xl text-[#2C1810] mb-3">{viewingTreat.name}</h3>
                {viewingTreat.description && (
                  <p className="text-[#6B5344] mb-4 leading-relaxed">{viewingTreat.description}</p>
                )}
                <button
                  onClick={() => setViewingTreat(null)}
                  className="px-8 py-3 rounded-full text-white font-medium"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
