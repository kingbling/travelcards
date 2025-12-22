"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Clock,
  ExternalLink,
  Star,
  Camera,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { Card as CardType, Memory, RARITY_CONFIG, CATEGORY_CONFIG, CardCategory, PROFILE_CONFIG, TargetProfile } from "@/types/database";

interface CardData extends CardType {
  memory?: Memory;
}

export default function CardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const cardId = params.id as string;

  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMemoryForm, setShowMemoryForm] = useState(false);
  const [memoryNote, setMemoryNote] = useState("");
  const [memoryRating, setMemoryRating] = useState(0);
  const [saving, setSaving] = useState(false);

  // Check authentication
  useEffect(() => {
    const authenticated = sessionStorage.getItem(`journey-${slug}-authenticated`);
    if (authenticated !== "true") {
      router.replace(`/j/${slug}`);
    }
  }, [slug, router]);

  // Fetch card
  useEffect(() => {
    async function fetchCard() {
      try {
        const res = await fetch(`/api/journey/${slug}/card/${cardId}`);
        if (res.ok) {
          const data = await res.json();
          setCard(data);
          if (data.memory) {
            setMemoryNote(data.memory.note || "");
            setMemoryRating(data.memory.rating || 0);
          }
        }
      } catch {
        // Error
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, [slug, cardId]);

  const handleSaveMemory = async () => {
    if (!card) return;
    setSaving(true);

    try {
      await fetch(`/api/journey/${slug}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          note: memoryNote,
          rating: memoryRating,
        }),
      });

      setShowMemoryForm(false);
      // Refresh card data
      const res = await fetch(`/api/journey/${slug}/card/${cardId}`);
      if (res.ok) {
        setCard(await res.json());
      }
    } catch {
      // Error
    } finally {
      setSaving(false);
    }
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

  if (!card) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
        <p className="text-[#6B5344]">Card not found</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6] px-6 py-8">
      {/* Header */}
      <header className="flex items-center mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
      </header>

      <div className="max-w-lg mx-auto">
        {/* Card header */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg border border-[#E5DDD5] overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Rarity banner */}
          <div
            className="h-2"
            style={{
              background: `linear-gradient(90deg, ${RARITY_CONFIG[card.rarity].color}, ${RARITY_CONFIG[card.rarity].color}80)`,
            }}
          />

          <div className="p-6">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  backgroundColor: RARITY_CONFIG[card.rarity].bgColor,
                  color: RARITY_CONFIG[card.rarity].color,
                }}
              >
                {RARITY_CONFIG[card.rarity].label}
              </span>
              {card.category && CATEGORY_CONFIG[card.category as CardCategory] && (
                <span className="text-sm px-2 py-1 bg-[#FAF0E6] rounded-full">
                  {CATEGORY_CONFIG[card.category as CardCategory].icon}{" "}
                  {CATEGORY_CONFIG[card.category as CardCategory].label}
                </span>
              )}
              {card.target_profile && PROFILE_CONFIG[card.target_profile as TargetProfile] && (
                <span className="text-sm px-2 py-1 bg-[#FAF0E6] rounded-full">
                  {PROFILE_CONFIG[card.target_profile as TargetProfile].icon}{" "}
                  {PROFILE_CONFIG[card.target_profile as TargetProfile].label}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-2xl text-[#2C1810] mb-3">
              {card.name}
            </h1>

            {/* Description */}
            {card.description && (
              <p className="text-[#6B5344] mb-6 leading-relaxed">
                {card.description}
              </p>
            )}

            {/* Details */}
            <div className="flex flex-wrap gap-4 text-sm text-[#6B5344] mb-6">
              {card.duration_hours && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{card.duration_hours} hours</span>
                </div>
              )}
              {card.estimated_cost && (
                <div className="flex items-center gap-1">
                  <span>
                    {card.currency} {card.estimated_cost}
                  </span>
                </div>
              )}
            </div>

            {/* Booking button */}
            {card.booking_url && (
              <a
                href={card.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white font-medium rounded-full hover:shadow-lg transition-all"
              >
                Book This Experience
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Location/Map */}
            {card.location_address && (
              <div className="mt-4 p-4 bg-[#FDF8F3] rounded-xl">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#E07B39] mt-0.5" />
                  <div className="flex-1">
                    {card.location_name && (
                      <p className="font-medium text-[#2C1810] mb-1">{card.location_name}</p>
                    )}
                    <p className="text-sm text-[#6B5344] mb-3">{card.location_address}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.location_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#E07B39] hover:underline"
                    >
                      <MapPin className="w-4 h-4" />
                      Open in Maps
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Personal note */}
            {card.personal_note && (
              <div className="mt-6 p-4 bg-[#C9A227]/10 rounded-xl">
                <div className="flex items-center gap-2 text-[#C9A227] mb-2">
                  <Heart className="w-4 h-4" fill="currentColor" />
                  <span className="text-sm font-medium">Personal Note</span>
                </div>
                <p className="text-[#2C1810] italic">&ldquo;{card.personal_note}&rdquo;</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Memory section */}
        <motion.div
          className="mt-6 bg-white rounded-2xl shadow-sm border border-[#E5DDD5] p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-serif text-xl text-[#2C1810] mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#C9A227]" />
            Your Memory
          </h2>

          {card.memory && !showMemoryForm ? (
            <div>
              {/* Rating */}
              {card.memory.rating && (
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= card.memory!.rating!
                          ? "text-[#C9A227] fill-[#C9A227]"
                          : "text-[#E5DDD5]"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Note */}
              {card.memory.note && (
                <p className="text-[#6B5344] mb-4">{card.memory.note}</p>
              )}

              <button
                onClick={() => setShowMemoryForm(true)}
                className="text-sm text-[#C9A227] hover:underline"
              >
                Edit memory
              </button>
            </div>
          ) : showMemoryForm ? (
            <div>
              {/* Rating input */}
              <div className="mb-4">
                <label className="block text-sm text-[#6B5344] mb-2">
                  How was it?
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setMemoryRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= memoryRating
                            ? "text-[#C9A227] fill-[#C9A227]"
                            : "text-[#E5DDD5] hover:text-[#C9A227]"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Note input */}
              <div className="mb-4">
                <label className="block text-sm text-[#6B5344] mb-2">
                  Add a note
                </label>
                <textarea
                  value={memoryNote}
                  onChange={(e) => setMemoryNote(e.target.value)}
                  placeholder="What made this experience special?"
                  className="w-full p-3 border border-[#E5DDD5] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveMemory}
                  disabled={saving}
                  className="flex-1 py-2 px-4 bg-[#C9A227] text-white rounded-full hover:bg-[#B8911F] transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Memory"}
                </button>
                <button
                  onClick={() => setShowMemoryForm(false)}
                  className="py-2 px-4 text-[#6B5344] hover:text-[#2C1810] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowMemoryForm(true)}
              className="flex items-center gap-2 text-[#6B5344] hover:text-[#C9A227] transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Add your memory of this experience</span>
            </button>
          )}
        </motion.div>
      </div>
    </main>
  );
}
