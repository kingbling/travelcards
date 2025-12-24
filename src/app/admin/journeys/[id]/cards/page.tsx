"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Trash2,
  Edit3,
  Loader2,
  MapPin,
  Clock,
  DollarSign,
  ExternalLink,
  Save,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { CATEGORY_CONFIG, RARITY_CONFIG, PROFILE_CONFIG } from "@/types/database";
import type { Card, CardCategory, TargetProfile, Rarity } from "@/types/database";

interface Destination {
  id: string;
  name: string;
  country: string | null;
}

interface Journey {
  id: string;
  name: string;
  destinations: Destination[];
}

export default function ManageCardsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const journeyId = params.id as string;
  const supabase = createClient();

  // Get initial destination from URL query param
  const initialDestination = searchParams.get("destination") || "all";

  const [journey, setJourney] = useState<Journey | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<string>(initialDestination);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Card>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Load journey and cards
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadData = async () => {
      // Fetch journey with destinations
      const { data: journeyData, error: journeyError } = await supabase
        .from("journeys")
        .select(`
          id, name,
          destinations(id, name, country, start_date)
        `)
        .eq("id", journeyId)
        .single();

      if (journeyError || !journeyData) {
        setError("Journey not found");
        setIsLoading(false);
        return;
      }

      // Sort destinations by start_date
      type DestWithDate = Destination & { start_date?: string | null };
      const destinations = journeyData.destinations as DestWithDate[];
      const sortedDestinations = destinations.sort((a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
      setJourney({ ...journeyData, destinations: sortedDestinations } as unknown as Journey);

      // Fetch all cards for this journey's destinations
      const destinationIds = (journeyData.destinations as Destination[])?.map(d => d.id) || [];

      if (destinationIds.length > 0) {
        const { data: cardsData, error: cardsError } = await supabase
          .from("cards")
          .select("*")
          .in("destination_id", destinationIds)
          .order("order_index", { ascending: true });

        if (!cardsError && cardsData) {
          setCards(cardsData as unknown as Card[]);
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, [journeyId, supabase]);

  // Filter cards by selected destination
  const filteredCards = cards.filter(card => {
    if (selectedDestination !== "all" && card.destination_id !== selectedDestination) return false;
    return true;
  });

  // Get stats for selected destination
  const selectedDestinationData = selectedDestination !== "all"
    ? journey?.destinations.find(d => d.id === selectedDestination)
    : null;

  const filteredStats = {
    total: filteredCards.length,
    revealed: filteredCards.filter(c => c.is_revealed).length,
    approved: filteredCards.filter(c => c.status === "approved").length,
  };

  // Handle destination change and update URL
  const handleDestinationChange = (destId: string) => {
    setSelectedDestination(destId);
    const newUrl = destId === "all"
      ? `/admin/journeys/${journeyId}/cards`
      : `/admin/journeys/${journeyId}/cards?destination=${destId}`;
    router.push(newUrl, { scroll: false });
  };

  // Delete card (and its reveal record)
  const handleDelete = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return;

    setIsSaving(true);

    // First delete the reveal record (if any) to free up quota
    await supabase
      .from("reveals")
      .delete()
      .eq("card_id", cardId);

    // Then delete the card
    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", cardId);

    if (!error) {
      setCards(cards.filter(c => c.id !== cardId));
    } else {
      setError("Failed to delete card");
    }
    setIsSaving(false);
  };

  // Start editing
  const handleStartEdit = (card: Card) => {
    setEditingCard(card.id);
    setEditForm({
      name: card.name,
      description: card.description,
      category: card.category,
      target_profile: card.target_profile,
      rarity: card.rarity,
      estimated_cost: card.estimated_cost,
      duration_hours: card.duration_hours,
      booking_method: card.booking_method,
      booking_url: card.booking_url,
      location_name: card.location_name,
      location_address: card.location_address,
    });
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingCard) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("cards")
      .update(editForm)
      .eq("id", editingCard);

    if (!error) {
      setCards(cards.map(c => c.id === editingCard ? { ...c, ...editForm } as Card : c));
      setEditingCard(null);
      setEditForm({});
    } else {
      setError("Failed to save changes");
    }
    setIsSaving(false);
  };

  // Get destination name
  const getDestinationName = (destId: string) => {
    return journey?.destinations.find(d => d.id === destId)?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A227]" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="text-center py-16">
        <p className="text-[#6B5344]">Journey not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        href={`/admin/journeys/${journeyId}`}
        className="inline-flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to journey
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">Experience Cards</h1>
        <p className="text-[#6B5344]">{journey.name}</p>
      </div>

      {/* Destination Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E5DDD5] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[#E07B39]" />
            <div className="relative">
              <select
                value={selectedDestination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                className="appearance-none bg-[#FAF0E6] px-4 py-2 pr-10 rounded-lg text-[#2C1810] font-medium focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 cursor-pointer"
              >
                <option value="all">All Destinations</option>
                {journey.destinations.map(dest => (
                  <option key={dest.id} value={dest.id}>
                    {dest.name}{dest.country ? `, ${dest.country}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5344] pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-[#6B5344]">
            <span>{filteredStats.total} cards</span>
            <span className="text-emerald-600">{filteredStats.approved} approved</span>
            {filteredStats.revealed > 0 && (
              <span className="text-blue-600">{filteredStats.revealed} revealed</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={selectedDestination !== "all"
              ? `/admin/journeys/${journeyId}/generate?destination=${selectedDestination}`
              : `/admin/journeys/${journeyId}/generate`
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate {selectedDestination !== "all" && filteredStats.total > 0 ? "More " : ""}Cards
          </Link>
        </div>

        {filteredCards.filter(c => !c.is_revealed).length > 0 && (
          <button
            onClick={async () => {
              const unrevealed = filteredCards.filter(c => !c.is_revealed);
              if (!confirm(`Delete all ${unrevealed.length} unrevealed cards? This cannot be undone.`)) return;
              setIsSaving(true);
              for (const card of unrevealed) {
                await supabase.from("reveals").delete().eq("card_id", card.id);
                await supabase.from("cards").delete().eq("id", card.id);
              }
              setCards(cards.filter(c => c.is_revealed || !filteredCards.find(fc => fc.id === c.id)));
              setIsSaving(false);
            }}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete {filteredCards.filter(c => !c.is_revealed).length} Unrevealed
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-6">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Cards List */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E5DDD5]">
          <Sparkles className="w-12 h-12 text-[#C9A227] mx-auto mb-4" />
          <h2 className="font-serif text-2xl text-[#2C1810] mb-2">
            {selectedDestination !== "all" ? "No cards for this destination" : "No cards yet"}
          </h2>
          <p className="text-[#6B5344]">
            Generate AI-powered experience cards for your travelers using the button above
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-xl shadow-sm border border-[#E5DDD5] overflow-hidden"
            >
              {editingCard === card.id ? (
                // Edit Mode
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#6B5344] mb-1">Name</label>
                      <input
                        type="text"
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E5DDD5] rounded-lg focus:border-[#C9A227] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B5344] mb-1">Category</label>
                      <select
                        value={editForm.category || "culture"}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value as CardCategory })}
                        className="w-full px-3 py-2 border border-[#E5DDD5] rounded-lg focus:border-[#C9A227] outline-none"
                      >
                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.icon} {config.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#6B5344] mb-1">Description</label>
                    <textarea
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-[#E5DDD5] rounded-lg focus:border-[#C9A227] outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#6B5344] mb-1">Target</label>
                      <select
                        value={editForm.target_profile || "family"}
                        onChange={(e) => setEditForm({ ...editForm, target_profile: e.target.value as TargetProfile })}
                        className="w-full px-3 py-2 border border-[#E5DDD5] rounded-lg focus:border-[#C9A227] outline-none"
                      >
                        {Object.entries(PROFILE_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.icon} {config.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B5344] mb-1">Rarity</label>
                      <select
                        value={editForm.rarity || "common"}
                        onChange={(e) => setEditForm({ ...editForm, rarity: e.target.value as Rarity })}
                        className="w-full px-3 py-2 border border-[#E5DDD5] rounded-lg focus:border-[#C9A227] outline-none"
                      >
                        {Object.entries(RARITY_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B5344] mb-1">Cost</label>
                      <input
                        type="text"
                        value={editForm.estimated_cost || ""}
                        onChange={(e) => setEditForm({ ...editForm, estimated_cost: e.target.value })}
                        placeholder="e.g. R150 (~$8)"
                        className="w-full px-3 py-2 border border-[#E5DDD5] rounded-lg focus:border-[#C9A227] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#6B5344] mb-1">Location Name</label>
                      <input
                        type="text"
                        value={editForm.location_name || ""}
                        onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E5DDD5] rounded-lg focus:border-[#C9A227] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#6B5344] mb-1">Booking URL</label>
                      <input
                        type="url"
                        value={editForm.booking_url || ""}
                        onChange={(e) => setEditForm({ ...editForm, booking_url: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E5DDD5] rounded-lg focus:border-[#C9A227] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#E5DDD5]">
                    <button
                      onClick={() => { setEditingCard(null); setEditForm({}); }}
                      className="px-4 py-2 text-[#6B5344] hover:text-[#2C1810]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-[#C9A227] text-white rounded-lg font-medium hover:bg-[#B8911F] disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex">
                  {/* Card Preview */}
                  <div
                    className="w-24 h-24 flex-shrink-0 flex items-center justify-center text-3xl"
                    style={{ backgroundColor: RARITY_CONFIG[card.rarity as Rarity || "common"].bgColor }}
                  >
                    {card.category ? CATEGORY_CONFIG[card.category as CardCategory]?.icon : "?"}
                  </div>

                  {/* Card Details */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-[#2C1810]">{card.name}</h3>
                          <span
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: RARITY_CONFIG[card.rarity as Rarity || "common"].bgColor,
                              color: RARITY_CONFIG[card.rarity as Rarity || "common"].color,
                            }}
                          >
                            {RARITY_CONFIG[card.rarity as Rarity || "common"].label}
                          </span>
                        </div>
                        <p className="text-sm text-[#6B5344] line-clamp-2 mb-2">{card.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-[#6B5344]">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {getDestinationName(card.destination_id || "")}
                          </span>
                          <span className="flex items-center gap-1">
                            {card.category && CATEGORY_CONFIG[card.category as CardCategory]?.icon} {card.category && CATEGORY_CONFIG[card.category as CardCategory]?.label}
                          </span>
                          <span className="flex items-center gap-1">
                            {card.target_profile && PROFILE_CONFIG[card.target_profile as TargetProfile]?.icon} {card.target_profile && PROFILE_CONFIG[card.target_profile as TargetProfile]?.label}
                          </span>
                          {card.estimated_cost && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {card.estimated_cost}
                            </span>
                          )}
                          {card.duration_hours && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {card.duration_hours}h
                            </span>
                          )}
                          {card.booking_url && (
                            <a
                              href={card.booking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[#E07B39] hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Book
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(card)}
                          className="p-2 text-[#6B5344] hover:bg-[#FDF8F3] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(card.id)}
                          disabled={isSaving}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
