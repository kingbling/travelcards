"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Calendar, ChevronRight, Heart, Lock } from "lucide-react";
import { Destination, Chapter } from "@/types/database";

interface JourneyData {
  id: string;
  name: string;
  recipient_name: string;
  destinations: (Destination & {
    chapters: (Chapter & { revealed_count: number; total_count: number })[];
  })[];
}

export default function JourneyPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(new Date());

  // Check authentication
  useEffect(() => {
    const authenticated = sessionStorage.getItem(`journey-${slug}-authenticated`);
    if (authenticated !== "true") {
      router.replace(`/j/${slug}`);
    }
  }, [slug, router]);

  // Fetch journey data
  useEffect(() => {
    async function fetchJourney() {
      try {
        const res = await fetch(`/api/journey/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setJourney(data);
        }
      } catch {
        // Error fetching journey
      } finally {
        setLoading(false);
      }
    }
    fetchJourney();
  }, [slug]);

  const isDestinationActive = (destination: Destination) => {
    if (!destination.start_date || !destination.end_date) return false;
    const start = new Date(destination.start_date);
    const end = new Date(destination.end_date);
    return currentDate >= start && currentDate <= end;
  };

  const isDestinationUpcoming = (destination: Destination) => {
    if (!destination.start_date) return false;
    const start = new Date(destination.start_date);
    return currentDate < start;
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  const getThemeColors = (destination: Destination) => {
    const colors = destination.theme_colors as { primary?: string; secondary?: string } | null;
    return {
      primary: colors?.primary || "#E07B39",
      secondary: colors?.secondary || "#C9A227",
    };
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
        <motion.div
          className="text-[#C9A227]"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Heart className="w-8 h-8" />
        </motion.div>
      </main>
    );
  }

  if (!journey) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
        <p className="text-[#6B5344]">Journey not found</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6] px-6 py-8">
      {/* Header */}
      <motion.header
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">{journey.name}</h1>
        <p className="text-[#6B5344]">
          {journey.destinations.length} destinations await
        </p>
      </motion.header>

      {/* Destination Timeline */}
      <div className="max-w-md mx-auto relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#C9A227] via-[#E5DDD5] to-[#E5DDD5]" />

        {journey.destinations.map((destination, idx) => {
          const isActive = isDestinationActive(destination);
          const isUpcoming = isDestinationUpcoming(destination);
          const colors = getThemeColors(destination);
          const totalRevealed = destination.chapters.reduce(
            (sum, ch) => sum + ch.revealed_count,
            0
          );
          const totalCards = destination.chapters.reduce(
            (sum, ch) => sum + ch.total_count,
            0
          );

          return (
            <motion.div
              key={destination.id}
              className="relative pl-16 pb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-4 w-5 h-5 rounded-full border-2 ${
                  isActive
                    ? "border-white bg-gradient-to-br shadow-lg"
                    : isUpcoming
                    ? "border-[#E5DDD5] bg-white"
                    : "border-[#C9A227] bg-[#C9A227]"
                }`}
                style={
                  isActive
                    ? {
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      }
                    : {}
                }
              />

              {/* Destination card */}
              <motion.button
                onClick={() => {
                  if (!isUpcoming) {
                    const firstChapter = destination.chapters[0];
                    if (firstChapter) {
                      router.push(`/j/${slug}/chapter/${firstChapter.id}`);
                    }
                  }
                }}
                disabled={isUpcoming}
                className={`w-full text-left p-5 rounded-xl border transition-all ${
                  isActive
                    ? "bg-white shadow-lg border-transparent"
                    : isUpcoming
                    ? "bg-white/50 border-[#E5DDD5] opacity-60 cursor-not-allowed"
                    : "bg-white/80 border-[#E5DDD5] hover:shadow-md hover:border-[#C9A227]"
                }`}
                style={
                  isActive
                    ? {
                        boxShadow: `0 4px 20px ${colors.primary}20`,
                      }
                    : {}
                }
                whileHover={!isUpcoming ? { scale: 1.02 } : {}}
                whileTap={!isUpcoming ? { scale: 0.98 } : {}}
              >
                {/* Destination header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin
                      className="w-5 h-5"
                      style={{ color: colors.primary }}
                    />
                    <h2 className="font-serif text-xl text-[#2C1810]">
                      {destination.name}
                    </h2>
                  </div>
                  {isUpcoming ? (
                    <Lock className="w-5 h-5 text-[#6B5344]/50" />
                  ) : (
                    <ChevronRight
                      className="w-5 h-5"
                      style={{ color: colors.primary }}
                    />
                  )}
                </div>

                {/* Country */}
                {destination.country && (
                  <p className="text-sm text-[#6B5344] mb-2">
                    {destination.country}
                  </p>
                )}

                {/* Date range */}
                <div className="flex items-center gap-2 text-sm text-[#6B5344] mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDateRange(destination.start_date, destination.end_date)}
                  </span>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[#E5DDD5] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                      }}
                      initial={{ width: 0 }}
                      animate={{
                        width: totalCards > 0 ? `${(totalRevealed / totalCards) * 100}%` : "0%",
                      }}
                      transition={{ duration: 0.8, delay: 0.3 + idx * 0.1 }}
                    />
                  </div>
                  <span className="text-sm text-[#6B5344]">
                    {totalRevealed}/{totalCards}
                  </span>
                </div>

                {/* Chapters preview */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {destination.chapters.map((chapter) => (
                    <span
                      key={chapter.id}
                      className={`text-xs px-2 py-1 rounded-full ${
                        chapter.revealed_count === chapter.total_count
                          ? "bg-[#059669]/10 text-[#059669]"
                          : "bg-[#E5DDD5] text-[#6B5344]"
                      }`}
                    >
                      {chapter.name}
                    </span>
                  ))}
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Collection link */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={() => router.push(`/j/${slug}/collection`)}
          className="text-[#6B5344] hover:text-[#C9A227] transition-colors underline underline-offset-4"
        >
          View your card collection
        </button>
      </motion.div>
    </main>
  );
}
