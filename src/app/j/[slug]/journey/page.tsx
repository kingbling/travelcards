"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Calendar, ChevronRight, Lock, List, Map as MapIcon, Gift } from "lucide-react";
import { Destination } from "@/types/database";
import type { CardLocation } from "@/types";
import { useJourneyAuth } from "@/hooks/useJourneyAuth";
import { useDestinationPhotos } from "@/hooks/useDestinationPhoto";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Tabs } from "@/components/ui/Tabs";
import { JourneyMap } from "@/components/journey/JourneyMap";
import { TreatsTab } from "@/components/journey/TreatsTab";

interface JourneyData {
  id: string;
  name: string;
  recipient_name: string;
  reveals_per_week: number;
  destinations: (Destination & {
    total_count: number;
    revealed_count: number;
  })[];
}

export default function JourneyPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"timeline" | "map" | "treats">("timeline");
  const [mapCards, setMapCards] = useState<CardLocation[]>([]);
  const [hasTreats, setHasTreats] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useJourneyAuth({ slug });

  // Prepare destinations for photo fetching (with IDs for caching)
  const destinationsList = (journey?.destinations || []).map(d => ({
    id: d.id,
    name: d.name,
    country: d.country,
  }));

  // Fetch destination photos (cached in DB after first fetch)
  const { photos: destinationPhotos } = useDestinationPhotos(destinationsList);

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

  // Fetch map data
  useEffect(() => {
    async function fetchMapData() {
      try {
        const res = await fetch(`/api/journey/${slug}/map`);
        if (res.ok) {
          const data = await res.json();
          setMapCards(data.cards || []);
        }
      } catch {
        // Error fetching map data
      }
    }
    fetchMapData();
  }, [slug]);

  // Check if treats exist
  useEffect(() => {
    async function checkTreats() {
      try {
        const res = await fetch(`/api/journey/${slug}/treats`);
        if (res.ok) {
          const data = await res.json();
          setHasTreats(data.treats && data.treats.length > 0);
        }
      } catch {
        // Error fetching treats
      }
    }
    checkTreats();
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

  if (loading || authLoading) {
    return <LoadingSpinner />;
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
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">{journey.name}</h1>
        <p className="text-[#6B5344]">
          {journey.destinations.length} destinations await
        </p>
      </motion.header>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: "timeline", label: "Timeline", icon: <List className="w-4 h-4" /> },
          { id: "map", label: "Map", icon: <MapIcon className="w-4 h-4" /> },
          ...(hasTreats ? [{ id: "treats", label: "Treats", icon: <Gift className="w-4 h-4" /> }] : []),
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as "timeline" | "map" | "treats")}
        className="max-w-md mx-auto mb-8"
      />

      {/* Timeline View */}
      {activeTab === "timeline" && (
        <div className="max-w-md mx-auto relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#C9A227] via-[#E5DDD5] to-[#E5DDD5]" />

        {journey.destinations.map((destination, idx) => {
          const isActive = isDestinationActive(destination);
          const isUpcoming = isDestinationUpcoming(destination);
          const colors = getThemeColors(destination);
          const totalCards = destination.total_count;
          const totalRevealed = destination.revealed_count;
          const destinationPhoto = destinationPhotos.get(destination.id);

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
                  if (totalCards > 0) {
                    router.push(`/j/${slug}/destination/${destination.id}`);
                  }
                }}
                disabled={totalCards === 0}
                className={`w-full text-left rounded-xl border transition-all overflow-hidden ${
                  isActive
                    ? "bg-white shadow-lg border-transparent"
                    : totalCards === 0
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
                whileHover={totalCards > 0 ? { scale: 1.02 } : {}}
                whileTap={totalCards > 0 ? { scale: 0.98 } : {}}
              >
                <div className="flex">
                  {/* Destination photo thumbnail */}
                  <div
                    className="w-24 md:w-32 flex-shrink-0 bg-cover bg-center"
                    style={{
                      backgroundImage: destinationPhoto?.imageUrl
                        ? `url(${destinationPhoto.imageUrl})`
                        : `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}30)`,
                    }}
                  >
                    {!destinationPhoto?.imageUrl && (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-white/60" style={{ color: colors.primary }} />
                      </div>
                    )}
                  </div>

                  {/* Card content */}
                  <div className="flex-1 p-4">
                    {/* Destination header */}
                    <div className="flex items-start justify-between mb-2">
                      <h2 className="font-serif text-lg md:text-xl text-[#2C1810]">
                        {destination.name}
                      </h2>
                      {isUpcoming ? (
                        <Lock className="w-5 h-5 text-[#6B5344]/50" />
                      ) : totalCards === 0 ? (
                        <span className="text-xs text-[#6B5344]/50">No cards</span>
                      ) : (
                        <ChevronRight
                          className="w-5 h-5"
                          style={{ color: colors.primary }}
                        />
                      )}
                    </div>

                    {/* Country */}
                    {destination.country && (
                      <p className="text-sm text-[#6B5344] mb-1">
                        {destination.country}
                      </p>
                    )}

                    {/* Date range */}
                    <div className="flex items-center gap-2 text-xs text-[#6B5344] mb-2">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {formatDateRange(destination.start_date, destination.end_date)}
                      </span>
                    </div>

                    {/* Progress */}
                    {totalCards > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#E5DDD5] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{
                                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                              }}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(totalRevealed / totalCards) * 100}%`,
                              }}
                              transition={{ duration: 0.8, delay: 0.3 + idx * 0.1 }}
                            />
                          </div>
                          <span className="text-xs text-[#6B5344]">
                            {totalRevealed}/{totalCards}
                          </span>
                        </div>

                        {/* Humanized description */}
                        <p className="mt-2 text-xs text-[#6B5344] italic">
                          {totalRevealed === 0
                            ? `${totalCards} experience${totalCards === 1 ? '' : 's'} await`
                            : totalRevealed === totalCards
                            ? `All revealed!`
                            : `${totalCards - totalRevealed} more to discover`
                          }
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
        </div>
      )}

      {/* Map View */}
      {activeTab === "map" && (
        <JourneyMap
          cards={mapCards}
          destinations={journey.destinations}
          journeyName={journey.name}
        />
      )}

      {/* Treats View */}
      {activeTab === "treats" && hasTreats && <TreatsTab journeySlug={slug} />}

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
