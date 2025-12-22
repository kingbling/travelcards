"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Calendar,
  Eye,
  EyeOff,
  MapPin,
  Clock,
  Sparkles,
  Check,
} from "lucide-react";

interface Card {
  id: string;
  name: string;
  category: string | null;
  rarity: string | null;
  experience_date: string | null;
  reveal_date: string | null;
  is_revealed: boolean;
  status: string;
  destination: {
    name: string;
  } | null;
}

interface Journey {
  id: string;
  name: string;
  reveals_per_week: number | null;
  advance_reveal_days: number | null;
}

export default function SchedulePage() {
  const params = useParams();
  const journeyId = params.id as string;
  const supabase = createClient();

  const [journey, setJourney] = useState<Journey | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings
  const [revealsPerWeek, setRevealsPerWeek] = useState(2);
  const [advanceRevealDays, setAdvanceRevealDays] = useState(7);

  useEffect(() => {
    loadData();
  }, [journeyId]);

  const loadData = async () => {
    setIsLoading(true);

    // Load journey settings
    const { data: journeyData } = await supabase
      .from("journeys")
      .select("id, name, reveals_per_week, advance_reveal_days")
      .eq("id", journeyId)
      .single();

    if (journeyData) {
      setJourney(journeyData);
      setRevealsPerWeek(journeyData.reveals_per_week ?? 2);
      setAdvanceRevealDays(journeyData.advance_reveal_days ?? 7);
    }

    // Load all approved cards with schedule info
    const { data: cardsData } = await supabase
      .from("cards")
      .select(`
        id,
        name,
        category,
        rarity,
        experience_date,
        reveal_date,
        is_revealed,
        status,
        destination:destinations(name)
      `)
      .eq("destination.journey_id", journeyId)
      .eq("status", "approved")
      .order("experience_date", { ascending: true, nullsFirst: false });

    if (cardsData) {
      setCards(cardsData as unknown as Card[]);
    }

    setIsLoading(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);

    await supabase
      .from("journeys")
      .update({
        reveals_per_week: revealsPerWeek,
        advance_reveal_days: advanceRevealDays,
      })
      .eq("id", journeyId);

    setIsSaving(false);
  };

  const updateCardDates = async (cardId: string, experienceDate: string, revealDate: string) => {
    await supabase
      .from("cards")
      .update({
        experience_date: experienceDate || null,
        reveal_date: revealDate || null,
      })
      .eq("id", cardId);

    // Update local state
    setCards(cards.map(c =>
      c.id === cardId
        ? { ...c, experience_date: experienceDate, reveal_date: revealDate }
        : c
    ));
  };

  const autoCalculateRevealDate = (experienceDate: string) => {
    if (!experienceDate) return "";
    const expDate = new Date(experienceDate);
    expDate.setDate(expDate.getDate() - advanceRevealDays);
    return expDate.toISOString().split("T")[0];
  };

  const getRarityColor = (rarity: string | null) => {
    switch (rarity) {
      case "legendary": return "bg-[#C9A227] text-white";
      case "rare": return "bg-blue-500 text-white";
      case "uncommon": return "bg-emerald-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-[#C9A227] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Group cards by week
  const cardsByWeek: { [week: string]: Card[] } = {};
  cards.forEach(card => {
    if (card.reveal_date) {
      const date = new Date(card.reveal_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      if (!cardsByWeek[weekKey]) cardsByWeek[weekKey] = [];
      cardsByWeek[weekKey].push(card);
    }
  });

  const unscheduledCards = cards.filter(c => !c.reveal_date);

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/admin/journeys/${journeyId}`}
        className="inline-flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to journey
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-[#2C1810] mb-2">Reveal Schedule</h1>
          <p className="text-[#6B5344]">Plan when cards are revealed to the recipient</p>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h2 className="font-serif text-xl text-[#2C1810] mb-4">Schedule Settings</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-2">
              Reveals per week
            </label>
            <select
              value={revealsPerWeek}
              onChange={(e) => setRevealsPerWeek(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] outline-none"
            >
              <option value={1}>1 card per week</option>
              <option value={2}>2 cards per week</option>
              <option value={3}>3 cards per week</option>
              <option value={5}>5 cards per week</option>
              <option value={7}>1 card per day</option>
            </select>
            <p className="text-sm text-[#6B5344] mt-1">
              Maximum cards the recipient can reveal each week
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C1810] mb-2">
              Reveal in advance
            </label>
            <select
              value={advanceRevealDays}
              onChange={(e) => setAdvanceRevealDays(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] outline-none"
            >
              <option value={3}>3 days before experience</option>
              <option value={5}>5 days before experience</option>
              <option value={7}>1 week before experience</option>
              <option value={14}>2 weeks before experience</option>
              <option value={21}>3 weeks before experience</option>
            </select>
            <p className="text-sm text-[#6B5344] mt-1">
              How early cards are revealed so you can plan
            </p>
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="mt-4 px-6 py-2 bg-[#2C1810] text-white rounded-lg text-sm font-medium hover:bg-[#3D2920] disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Schedule Timeline */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-[#E5DDD5]">
          <h2 className="font-serif text-xl text-[#2C1810]">Card Schedule</h2>
          <p className="text-sm text-[#6B5344] mt-1">
            As admin, you can see all cards. Set experience dates to auto-calculate reveal dates.
          </p>
        </div>

        <div className="divide-y divide-[#E5DDD5]">
          {cards.length === 0 ? (
            <div className="p-8 text-center text-[#6B5344]">
              No approved cards yet. Generate and approve cards first.
            </div>
          ) : (
            cards.map((card) => (
              <div key={card.id} className="p-4 hover:bg-[#FDF8F3]">
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center ${
                    card.is_revealed
                      ? "bg-emerald-100 text-emerald-600"
                      : card.reveal_date && new Date(card.reveal_date) <= new Date()
                      ? "bg-amber-100 text-amber-600"
                      : "bg-[#E5DDD5] text-[#6B5344]"
                  }`}>
                    {card.is_revealed ? (
                      <Check className="w-4 h-4" />
                    ) : card.reveal_date && new Date(card.reveal_date) <= new Date() ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </div>

                  {/* Card info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#2C1810]">{card.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRarityColor(card.rarity)}`}>
                        {card.rarity || "common"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#6B5344]">
                      {card.destination && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {card.destination.name}
                        </span>
                      )}
                      {card.category && (
                        <span>{card.category}</span>
                      )}
                    </div>
                  </div>

                  {/* Date inputs */}
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-xs text-[#6B5344] mb-1">Experience Date</label>
                      <input
                        type="date"
                        value={card.experience_date || ""}
                        onChange={(e) => {
                          const revealDate = autoCalculateRevealDate(e.target.value);
                          updateCardDates(card.id, e.target.value, revealDate);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[#E5DDD5] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B5344] mb-1">Reveal Date</label>
                      <input
                        type="date"
                        value={card.reveal_date || ""}
                        onChange={(e) => updateCardDates(card.id, card.experience_date || "", e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-[#E5DDD5] text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Weekly breakdown */}
      {Object.keys(cardsByWeek).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#E5DDD5]">
            <h2 className="font-serif text-xl text-[#2C1810]">Weekly Breakdown</h2>
            <p className="text-sm text-[#6B5344] mt-1">
              {revealsPerWeek} reveals allowed per week
            </p>
          </div>

          <div className="divide-y divide-[#E5DDD5]">
            {Object.entries(cardsByWeek)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([weekStart, weekCards]) => {
                const overLimit = weekCards.length > revealsPerWeek;
                return (
                  <div key={weekStart} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[#2C1810]">
                        Week of {new Date(weekStart).toLocaleDateString()}
                      </span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        overLimit ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                      }`}>
                        {weekCards.length} / {revealsPerWeek} cards
                        {overLimit && " ⚠️"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {weekCards.map(card => (
                        <span
                          key={card.id}
                          className="text-sm px-3 py-1 bg-[#FDF8F3] rounded-full text-[#6B5344]"
                        >
                          {card.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Unscheduled cards warning */}
      {unscheduledCards.length > 0 && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
            <Clock className="w-5 h-5" />
            {unscheduledCards.length} cards without dates
          </div>
          <p className="text-sm text-amber-600">
            Set experience dates for these cards to schedule their reveals:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {unscheduledCards.slice(0, 10).map(card => (
              <span key={card.id} className="text-sm px-2 py-1 bg-white rounded border border-amber-200">
                {card.name}
              </span>
            ))}
            {unscheduledCards.length > 10 && (
              <span className="text-sm text-amber-600">
                +{unscheduledCards.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
