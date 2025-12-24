"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Filter, Sparkles } from "lucide-react";
import { Card as CardType, Destination, RARITY_CONFIG, CATEGORY_CONFIG, CardCategory, getRarityConfig } from "@/types/database";
import { useJourneyAuth } from "@/hooks/useJourneyAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface CollectionData {
  journey_name: string;
  total_cards: number;
  revealed_cards: CardType[];
  destinations: Destination[];
}

export default function CollectionPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const { isAuthenticated, isLoading: authLoading } = useJourneyAuth({ slug });

  // Fetch collection
  useEffect(() => {
    async function fetchCollection() {
      try {
        const res = await fetch(`/api/journey/${slug}/collection`);
        if (res.ok) {
          const data = await res.json();
          setCollection(data);
        }
      } catch {
        // Error fetching collection
      } finally {
        setLoading(false);
      }
    }
    fetchCollection();
  }, [slug]);

  const filteredCards = collection?.revealed_cards.filter((card) => {
    if (filter === "all") return true;
    if (filter === "legendary") return card.rarity === "legendary";
    if (filter === "rare") return card.rarity === "rare";
    return card.category === filter;
  }) || [];

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  if (!collection) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
        <p className="text-[#6B5344]">Collection not found</p>
      </main>
    );
  }

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
      </header>

      {/* Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">
          Your Collection
        </h1>
        <p className="text-[#6B5344]">
          {collection.revealed_cards.length} of {collection.total_cards} cards
          collected
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-4 gap-3 mb-8 max-w-md mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {(["common", "uncommon", "rare", "legendary"] as const).map((rarity) => {
          const count = collection.revealed_cards.filter(
            (c) => c.rarity === rarity
          ).length;
          return (
            <div
              key={rarity}
              className="text-center p-3 rounded-xl"
              style={{ backgroundColor: `${RARITY_CONFIG[rarity].bgColor}50` }}
            >
              <p
                className="text-xl font-bold"
                style={{ color: RARITY_CONFIG[rarity].color }}
              >
                {count}
              </p>
              <p className="text-xs text-[#6B5344]">
                {RARITY_CONFIG[rarity].label}
              </p>
            </div>
          );
        })}
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex items-center gap-2 mb-6 overflow-x-auto pb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Filter className="w-4 h-4 text-[#6B5344] flex-shrink-0" />
        {["all", "legendary", "rare", ...Object.keys(CATEGORY_CONFIG)].map(
          (filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                filter === filterOption
                  ? "bg-[#C9A227] text-white"
                  : "bg-white text-[#6B5344] hover:bg-[#FAF0E6]"
              }`}
            >
              {filterOption === "all"
                ? "All"
                : filterOption === "legendary"
                ? "Legendary"
                : filterOption === "rare"
                ? "Rare"
                : CATEGORY_CONFIG[filterOption as CardCategory]?.label || filterOption}
            </button>
          )
        )}
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {filteredCards.map((card, idx) => (
          <motion.div
            key={card.id}
            className="bg-white rounded-xl shadow-sm border border-[#E5DDD5] p-4 cursor-pointer hover:shadow-md transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push(`/j/${slug}/card/${card.id}`)}
          >
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
              {card.category && CATEGORY_CONFIG[card.category as CardCategory] && (
                <span className="text-sm">
                  {CATEGORY_CONFIG[card.category as CardCategory].icon}
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
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {filteredCards.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Sparkles className="w-12 h-12 text-[#C9A227] mx-auto mb-4" />
          <p className="text-[#6B5344]">
            {filter === "all"
              ? "No cards revealed yet. Start your adventure!"
              : `No ${filter} cards found.`}
          </p>
        </motion.div>
      )}
    </main>
  );
}
