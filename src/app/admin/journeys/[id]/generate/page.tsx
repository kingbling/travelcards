"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Users,
  Calendar,
  Loader2,
  Check,
  X,
  ChevronRight,
  Edit3,
  RefreshCw,
  DollarSign,
  Clock,
  ExternalLink,
  Info,
} from "lucide-react";
import { CATEGORY_CONFIG, RARITY_CONFIG, PROFILE_CONFIG } from "@/types/database";
import type { CardCategory, TargetProfile, Rarity } from "@/types/database";

interface Destination {
  id: string;
  name: string;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  destination_type: string;
  cards?: { id: string; name: string }[];
  waypoints?: { name: string }[];
}

interface Participant {
  name: string;
  age: number | null;
  role: string | null;
  interests: string[] | null;
  is_recipient: boolean;
}

interface Journey {
  id: string;
  name: string;
  recipient_name: string | null;
  destinations: Destination[];
  participants: Participant[];
}

interface GeneratedCard {
  name: string;
  description: string;
  category: CardCategory;
  targetProfile: TargetProfile;
  rarity: Rarity;
  estimatedCost: string | null;
  durationHours: number | null;
  bookingMethod: string | null;
  bookingUrl: string | null;
  locationName: string | null;
  locationAddress: string | null;
}

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
}

type Step = "select" | "preview" | "generating" | "review";

export default function GenerateCardsPage() {
  const params = useParams();
  const router = useRouter();
  const journeyId = params.id as string;
  const supabase = createClient();

  const [journey, setJourney] = useState<Journey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<Step>("select");
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [cardCount, setCardCount] = useState(8);
  const [prompt, setPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Load journey data
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadJourney = async () => {
      const { data, error } = await supabase
        .from("journeys")
        .select(`
          id, name, recipient_name,
          participants(*),
          destinations(
            *,
            waypoints(*),
            cards(id, name)
          )
        `)
        .eq("id", journeyId)
        .single();

      if (!error && data) {
        setJourney(data as unknown as Journey);
      }
      setIsLoading(false);
    };

    loadJourney();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId]);

  // Generate prompt preview
  const generatePromptPreview = (dest: Destination) => {
    const travelers = journey?.participants || [];
    const existingCards = dest.cards?.map(c => c.name) || [];

    const travelerLines = travelers.map(t => {
      const interests = t.interests?.join(", ") || "no interests listed";
      const recipient = t.is_recipient ? " (Gift Recipient)" : "";
      return `- ${t.name}${t.age ? `, ${t.age}` : ""}${t.role ? `, ${t.role}` : ""}${recipient}: ${interests}`;
    }).join("\n");

    const existingSection = existingCards.length > 0
      ? `\nEXISTING CARDS (will not be duplicated):\n${existingCards.map(n => `- ${n}`).join("\n")}`
      : "";

    const waypointSection = dest.destination_type === "roadtrip" && dest.waypoints?.length
      ? `\nRoute stops: ${dest.waypoints.map(w => w.name).join(" → ")}`
      : "";

    return `DESTINATION: ${dest.name}${dest.country ? `, ${dest.country}` : ""}
DATES: ${dest.start_date ? new Date(dest.start_date).toLocaleDateString() : "Not set"} - ${dest.end_date ? new Date(dest.end_date).toLocaleDateString() : "Not set"}
${waypointSection}

TRAVELERS:
${travelerLines}
${existingSection}

GENERATE: ${cardCount} unique experience cards tailored to this group`;
  };

  // Handle destination selection
  const handleSelectDestination = (dest: Destination) => {
    setSelectedDestination(dest);
    setPrompt(generatePromptPreview(dest));
    setStep("preview");
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!selectedDestination) return;

    setStep("generating");
    setError(null);

    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journeyId,
          destinationId: selectedDestination.id,
          cardCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedCards(data.cards);
      if (data.usage) {
        setUsage(data.usage);
      }
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("preview");
    }
  };

  // Handle saving cards
  const handleSaveCards = async () => {
    if (!selectedDestination || generatedCards.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/generate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journeyId,
          destinationId: selectedDestination.id,
          cards: generatedCards,
          prompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Save failed");
      }

      // Redirect to journey management
      router.push(`/admin/journeys/${journeyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  // Remove a card from generated list
  const handleRemoveCard = (index: number) => {
    setGeneratedCards(cards => cards.filter((_, i) => i !== index));
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
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href={`/admin/journeys/${journeyId}`}
        className="inline-flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to journey
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E07B39] to-[#C9A227] flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-3xl text-[#2C1810]">Generate Cards</h1>
            <p className="text-[#6B5344]">{journey.name}</p>
          </div>
        </div>
      </div>

      {/* Step 1: Select Destination */}
      {step === "select" && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl text-[#2C1810] mb-4">
            Select a destination to generate cards for
          </h2>

          {journey.destinations.length > 0 ? (
            <div className="grid gap-4">
              {journey.destinations.map((dest) => (
                <button
                  key={dest.id}
                  onClick={() => handleSelectDestination(dest)}
                  className="bg-white rounded-xl p-6 shadow-sm border border-[#E5DDD5] text-left hover:border-[#C9A227] hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-[#E07B39]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-[#2C1810] text-lg">{dest.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-[#6B5344]">
                          {dest.country && <span>{dest.country}</span>}
                          {dest.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(dest.start_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            {dest.cards?.length || 0} cards
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#6B5344] group-hover:text-[#C9A227] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD5]">
              <MapPin className="w-12 h-12 text-[#C9A227] mx-auto mb-4" />
              <p className="text-[#6B5344] mb-4">No destinations added yet</p>
              <Link
                href={`/admin/journeys/${journeyId}/edit?step=3`}
                className="text-[#E07B39] hover:underline"
              >
                Add destinations first
              </Link>
            </div>
          )}

          {/* Travelers summary */}
          <div className="mt-8 p-4 bg-[#FDF8F3] rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[#6B5344]" />
              <span className="font-medium text-[#2C1810]">Travelers</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {journey.participants.map((p, i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm ${
                    p.is_recipient
                      ? "bg-[#C9A227]/20 text-[#C9A227] font-medium"
                      : "bg-white text-[#6B5344]"
                  }`}
                >
                  {p.name}
                  {p.interests && p.interests.length > 0 && (
                    <span className="text-xs opacity-70"> ({p.interests.slice(0, 2).join(", ")})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview Prompt */}
      {step === "preview" && selectedDestination && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-[#6B5344]">
            <button onClick={() => setStep("select")} className="hover:text-[#2C1810]">
              Destinations
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#2C1810] font-medium">{selectedDestination.name}</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#E5DDD5] overflow-hidden">
            <div className="p-4 border-b border-[#E5DDD5] flex items-center justify-between">
              <h2 className="font-serif text-xl text-[#2C1810]">Generation Preview</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-[#6B5344] hover:text-[#2C1810] flex items-center gap-1"
              >
                <Edit3 className="w-4 h-4" />
                {isEditing ? "Done" : "Edit"}
              </button>
            </div>

            <div className="p-6">
              {isEditing ? (
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-64 p-4 font-mono text-sm border border-[#E5DDD5] rounded-lg focus:border-[#C9A227] outline-none resize-none"
                />
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm text-[#2C1810] bg-[#FDF8F3] p-4 rounded-lg">
                  {prompt}
                </pre>
              )}

              {/* Card count selector */}
              <div className="mt-4 flex items-center gap-4">
                <label className="text-sm text-[#6B5344]">Number of cards:</label>
                <div className="flex items-center gap-2">
                  {[4, 6, 8, 10, 12].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setCardCount(n);
                        setPrompt(generatePromptPreview(selectedDestination).replace(
                          /GENERATE: \d+ unique/,
                          `GENERATE: ${n} unique`
                        ));
                      }}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        cardCount === n
                          ? "bg-[#C9A227] text-white"
                          : "bg-[#FDF8F3] text-[#6B5344] hover:bg-[#E5DDD5]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="px-6 pb-4">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            <div className="p-4 border-t border-[#E5DDD5] flex items-center justify-between">
              <button
                onClick={() => setStep("select")}
                className="px-4 py-2 text-[#6B5344] hover:text-[#2C1810]"
              >
                Back
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
              >
                <Sparkles className="w-5 h-5" />
                Generate {cardCount} Cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === "generating" && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#E07B39] to-[#C9A227] flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-serif text-2xl text-[#2C1810] mb-2">Creating experiences...</h2>
          <p className="text-[#6B5344]">
            AI is crafting personalized cards for {selectedDestination?.name}
          </p>
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A227] mx-auto mt-6" />
        </div>
      )}

      {/* Step 4: Review Generated Cards */}
      {step === "review" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-[#2C1810]">
                Generated {generatedCards.length} Cards
              </h2>
              <p className="text-[#6B5344]">for {selectedDestination?.name}</p>
            </div>
            <button
              onClick={() => {
                setGeneratedCards([]);
                setStep("preview");
              }}
              className="flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810]"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            {generatedCards.map((card, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border border-[#E5DDD5] relative group"
              >
                <button
                  onClick={() => handleRemoveCard(index)}
                  className="absolute top-4 right-4 p-1 text-[#6B5344] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${RARITY_CONFIG[card.rarity].bgColor}` }}
                  >
                    {CATEGORY_CONFIG[card.category]?.icon || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-[#2C1810]">{card.name}</h3>
                      <span
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{
                          backgroundColor: RARITY_CONFIG[card.rarity].bgColor,
                          color: RARITY_CONFIG[card.rarity].color,
                        }}
                      >
                        {RARITY_CONFIG[card.rarity].label}
                      </span>
                    </div>
                    <p className="text-[#6B5344] text-sm mb-3">{card.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-[#6B5344] mb-2">
                      <span className="flex items-center gap-1">
                        {CATEGORY_CONFIG[card.category]?.icon} {CATEGORY_CONFIG[card.category]?.label}
                      </span>
                      <span className="flex items-center gap-1">
                        {PROFILE_CONFIG[card.targetProfile]?.icon} {PROFILE_CONFIG[card.targetProfile]?.label}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-[#2C1810]">
                        <DollarSign className="w-3 h-3" />
                        {card.estimatedCost || "Free"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {card.durationHours ? `${card.durationHours}h` : "Flexible"}
                      </span>
                    </div>
                    {/* Booking info */}
                    <div className="flex items-start gap-2 text-xs bg-[#FDF8F3] p-2 rounded-lg">
                      <Info className="w-3 h-3 mt-0.5 text-[#6B5344] flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-[#6B5344]">{card.bookingMethod || "Just show up"}</span>
                        {card.bookingUrl && (
                          <a
                            href={card.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-[#E07B39] hover:underline"
                          >
                            Book <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Location/Map */}
                    {card.locationAddress && (
                      <div className="flex items-center gap-2 text-xs mt-2">
                        <MapPin className="w-3 h-3 text-[#E07B39]" />
                        <span className="text-[#6B5344]">{card.locationName || card.locationAddress}</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.locationAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#E07B39] hover:underline"
                        >
                          Map <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {generatedCards.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD5]">
              <p className="text-[#6B5344]">No cards generated. Try regenerating.</p>
            </div>
          )}

          {generatedCards.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#E5DDD5]">
              <button
                onClick={() => {
                  setGeneratedCards([]);
                  setStep("select");
                }}
                className="px-4 py-2 text-[#6B5344] hover:text-[#2C1810]"
              >
                Discard All
              </button>
              <button
                onClick={handleSaveCards}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Save {generatedCards.length} Cards as Drafts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
