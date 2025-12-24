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
  ChevronDown,
  Edit3,
  RefreshCw,
  DollarSign,
  Clock,
  ExternalLink,
  Info,
  Brain,
  Database,
  Search,
  FileText,
} from "lucide-react";
import { CATEGORY_CONFIG, RARITY_CONFIG, PROFILE_CONFIG, getRarityConfig } from "@/types/database";
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
  amadeusActivityId: string | null;
  pictureUrl: string | null;
}

interface GenerationStats {
  requested: number;
  generated: number;
  afterDedup: number;
  existingCount: number;
  fromRealExperiences: number;
  hasRealActivities: boolean;
  amadeusCount: number;
  googlePlacesCount: number;
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
  const [cardCount, setCardCount] = useState(12);
  const [prompt, setPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [hasRealActivities, setHasRealActivities] = useState(false);
  const [amadeusCount, setAmadeusCount] = useState(0);
  const [googlePlacesCount, setGooglePlacesCount] = useState(0);
  const [fullPrompt, setFullPrompt] = useState<string | null>(null);
  const [researchData, setResearchData] = useState<{
    amadeus: unknown[];
    googlePlaces: unknown[];
    combined: unknown[];
  } | null>(null);
  const [thinking, setThinking] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [showInputData, setShowInputData] = useState(false);
  const [showResearchData, setShowResearchData] = useState(false);
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

  // Handle generation with SSE streaming
  const handleGenerate = async () => {
    if (!selectedDestination) return;

    setStep("generating");
    setError(null);
    setThinking("");
    setShowThinking(true); // Show thinking panel during generation

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

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Generation failed");
      }

      // Handle SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "init") {
                // Check if we have real activities and store full prompt
                setHasRealActivities(data.hasRealActivities || false);
                setAmadeusCount(data.amadeusCount || 0);
                setGooglePlacesCount(data.googlePlacesCount || 0);
                setFullPrompt(data.prompt || null);
                setResearchData(data.researchData || null);
              } else if (data.type === "thinking") {
                // Update thinking in real-time
                setThinking(prev => (prev || "") + data.content);
              } else if (data.type === "complete") {
                // Generation complete
                setGeneratedCards(data.cards);
                setUsage(data.usage);
                setStats(data.stats);
                setStep("review");
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error("Parse error:", parseError);
            }
          }
        }
      }
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
                  {[8, 12, 16, 20].map((n) => (
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

      {/* Step 3: Generating with real-time thinking */}
      {step === "generating" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#E5DDD5]">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E07B39] to-[#C9A227] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif text-xl text-[#2C1810]">Generating for {selectedDestination?.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {amadeusCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {amadeusCount} Amadeus activities
                  </span>
                )}
                {googlePlacesCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {googlePlacesCount} Google Places
                  </span>
                )}
                {amadeusCount === 0 && googlePlacesCount === 0 && (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    Using web search + AI knowledge
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs for Input Data vs Thinking */}
          <div className="bg-white rounded-xl border border-[#E5DDD5] overflow-hidden">
            <div className="flex border-b border-[#E5DDD5]">
              <button
                onClick={() => setShowInputData(false)}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  !showInputData
                    ? "bg-[#2C1810] text-white"
                    : "text-[#6B5344] hover:bg-[#FDF8F3]"
                }`}
              >
                <Brain className="w-4 h-4" />
                AI Thinking
                <Loader2 className="w-3 h-3 animate-spin" />
              </button>
              <button
                onClick={() => setShowInputData(true)}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  showInputData
                    ? "bg-[#2C1810] text-white"
                    : "text-[#6B5344] hover:bg-[#FDF8F3]"
                }`}
              >
                <FileText className="w-4 h-4" />
                Input Data
              </button>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto bg-[#1a1a1a]">
              {showInputData ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                  {fullPrompt || "Loading prompt..."}
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-green-400 font-mono leading-relaxed">
                  {thinking || "Waiting for AI to start thinking..."}
                </pre>
              )}
            </div>
          </div>
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
              {stats && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {stats.amadeusCount > 0 && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      {stats.amadeusCount} Amadeus
                    </span>
                  )}
                  {stats.googlePlacesCount > 0 && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {stats.googlePlacesCount} Google Places
                    </span>
                  )}
                  {stats.fromRealExperiences > 0 && (
                    <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {stats.fromRealExperiences} verified bookable
                    </span>
                  )}
                  {!stats.hasRealActivities && stats.amadeusCount === 0 && stats.googlePlacesCount === 0 && (
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      Web search + AI knowledge
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setGeneratedCards([]);
                setThinking(null);
                setStats(null);
                setStep("preview");
              }}
              className="flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810]"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>

          {/* Debug Panel - Collapsible */}
          {(thinking || fullPrompt) && (
            <div className="bg-white rounded-xl border border-[#E5DDD5] overflow-hidden">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#FDF8F3] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-[#2C1810]">Generation Details</span>
                  {usage && (
                    <span className="text-xs text-[#6B5344] bg-[#FDF8F3] px-2 py-0.5 rounded-full">
                      {usage.totalTokens.toLocaleString()} tokens · ${usage.costUsd.toFixed(4)}
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-[#6B5344] transition-transform ${showThinking ? "rotate-180" : ""}`} />
              </button>

              {showThinking && (
                <div className="border-t border-[#E5DDD5]">
                  {/* Tabs */}
                  <div className="flex border-b border-[#E5DDD5]">
                    <button
                      onClick={() => { setShowInputData(false); setShowResearchData(false); }}
                      className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        !showInputData && !showResearchData
                          ? "bg-[#2C1810] text-white"
                          : "text-[#6B5344] hover:bg-[#FDF8F3]"
                      }`}
                    >
                      <Brain className="w-4 h-4" />
                      AI Reasoning
                    </button>
                    <button
                      onClick={() => { setShowInputData(true); setShowResearchData(false); }}
                      className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        showInputData && !showResearchData
                          ? "bg-[#2C1810] text-white"
                          : "text-[#6B5344] hover:bg-[#FDF8F3]"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Input Data
                    </button>
                    <button
                      onClick={() => { setShowInputData(false); setShowResearchData(true); }}
                      className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                        showResearchData
                          ? "bg-[#2C1810] text-white"
                          : "text-[#6B5344] hover:bg-[#FDF8F3]"
                      }`}
                    >
                      <Database className="w-4 h-4" />
                      Research Data
                      {researchData && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                          {researchData.combined.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="p-4 max-h-80 overflow-y-auto bg-[#1a1a1a]">
                    {showResearchData ? (
                      <div className="space-y-4">
                        {researchData ? (
                          <>
                            {/* Amadeus Data */}
                            {researchData.amadeus.length > 0 && (
                              <div className="border border-blue-500/30 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Database className="w-4 h-4 text-blue-400" />
                                  <span className="text-sm font-semibold text-blue-400">
                                    Amadeus Tours ({researchData.amadeus.length})
                                  </span>
                                </div>
                                <pre className="whitespace-pre-wrap text-xs text-gray-300 font-mono leading-relaxed">
                                  {JSON.stringify(researchData.amadeus, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Google Places Data */}
                            {researchData.googlePlaces.length > 0 && (
                              <div className="border border-green-500/30 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="w-4 h-4 text-green-400" />
                                  <span className="text-sm font-semibold text-green-400">
                                    Google Places ({researchData.googlePlaces.length})
                                  </span>
                                </div>
                                <pre className="whitespace-pre-wrap text-xs text-gray-300 font-mono leading-relaxed">
                                  {JSON.stringify(researchData.googlePlaces, null, 2)}
                                </pre>
                              </div>
                            )}

                            {researchData.amadeus.length === 0 && researchData.googlePlaces.length === 0 && (
                              <p className="text-gray-400 text-sm">No research data from external sources. Using AI knowledge only.</p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-400 text-sm">No research data available</p>
                        )}
                      </div>
                    ) : showInputData ? (
                      <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                        {fullPrompt || "No input data available"}
                      </pre>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm text-green-400 font-mono leading-relaxed">
                        {thinking || "No reasoning data available"}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            {generatedCards.map((card, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-[#E5DDD5] relative group overflow-hidden"
              >
                <button
                  onClick={() => handleRemoveCard(index)}
                  className="absolute top-4 right-4 z-10 p-1.5 bg-white/90 rounded-full text-[#6B5344] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex">
                  {/* Picture */}
                  {card.pictureUrl ? (
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-100">
                      <img
                        src={card.pictureUrl}
                        alt={card.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-32 h-32 flex-shrink-0 flex items-center justify-center text-4xl"
                      style={{ backgroundColor: `${getRarityConfig(card.rarity).bgColor}` }}
                    >
                      {CATEGORY_CONFIG[card.category]?.icon || "?"}
                    </div>
                  )}

                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-medium text-[#2C1810]">{card.name}</h3>
                      <span
                        className="px-2 py-0.5 text-xs rounded-full"
                        style={{
                          backgroundColor: getRarityConfig(card.rarity).bgColor,
                          color: getRarityConfig(card.rarity).color,
                        }}
                      >
                        {getRarityConfig(card.rarity).label}
                      </span>
                      {card.amadeusActivityId && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Verified
                        </span>
                      )}
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
                Save {generatedCards.length} Cards
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
