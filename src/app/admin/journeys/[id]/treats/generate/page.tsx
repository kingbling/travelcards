"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Sparkles, Loader2, Check, MapPin } from "lucide-react";

interface Destination {
  id: string;
  name: string;
  country: string | null;
}

interface Journey {
  id: string;
  name: string;
  recipient_name: string | null;
  destinations: Destination[];
}

export default function GenerateTreatsPage() {
  const params = useParams();
  const router = useRouter();
  const journeyId = params.id as string;
  const supabase = createClient();

  const [journey, setJourney] = useState<Journey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [treatCount, setTreatCount] = useState(5);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ generated: number; saved: number } | null>(null);

  useEffect(() => {
    loadJourney();
  }, [journeyId]);

  const loadJourney = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("journeys")
      .select(`
        id,
        name,
        recipient_name,
        destinations(id, name, country)
      `)
      .eq("id", journeyId)
      .single();

    if (error) {
      setError("Failed to load journey");
    } else {
      setJourney(data as Journey);
    }

    setIsLoading(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/journeys/${journeyId}/treats/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: treatCount,
          destinationId: selectedDestinationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setSuccess({
        generated: data.stats.generated,
        saved: data.stats.saved,
      });

      // Redirect to treats page after 2 seconds
      setTimeout(() => {
        router.push(`/admin/journeys/${journeyId}/treats`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-[#E07B39] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="text-center py-12">
        <p className="text-[#6B5344]">Journey not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href={`/admin/journeys/${journeyId}/treats`}
        className="inline-flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to treats
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#E07B39] to-[#C9A227] mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">Generate Treats</h1>
        <p className="text-[#6B5344]">
          Create personalized treats for {journey.recipient_name || "your recipient"}
        </p>
      </div>

      {/* Destination selector */}
      {journey.destinations && journey.destinations.length > 0 && (
        <div className="bg-white rounded-xl p-4 mb-6 border border-[#E5DDD5]">
          <p className="text-sm text-[#6B5344] mb-3">Generate treats for:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDestinationId(null)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedDestinationId === null
                  ? "bg-[#E07B39] text-white"
                  : "bg-[#FAF0E6] text-[#2C1810] hover:bg-[#E07B39]/10"
              }`}
            >
              <MapPin className="w-3 h-3" />
              All destinations
            </button>
            {journey.destinations.map((dest) => (
              <button
                key={dest.id}
                onClick={() => setSelectedDestinationId(dest.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedDestinationId === dest.id
                    ? "bg-[#E07B39] text-white"
                    : "bg-[#FAF0E6] text-[#2C1810] hover:bg-[#E07B39]/10"
                }`}
              >
                <MapPin className="w-3 h-3" />
                {dest.name}{dest.country && `, ${dest.country}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="bg-white rounded-xl p-6 mb-6 border border-[#E5DDD5]">
        <h2 className="font-medium text-[#2C1810] mb-4">Generation Settings</h2>

        <div>
          <label className="block text-sm text-[#6B5344] mb-2">
            Number of treats to generate
          </label>
          <div className="flex gap-2">
            {[3, 5, 8, 10].map((count) => (
              <button
                key={count}
                onClick={() => setTreatCount(count)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  treatCount === count
                    ? "bg-[#E07B39] text-white"
                    : "bg-[#FAF0E6] text-[#2C1810] hover:bg-[#E07B39]/10"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <p className="text-sm">
              Generated {success.generated} treats, saved {success.saved} to your journey!
            </p>
          </div>
          <p className="text-xs text-green-600 mt-1">Redirecting to treats page...</p>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !!success}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-xl font-medium text-lg hover:shadow-lg hover:shadow-[#E07B39]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating treats...
          </>
        ) : success ? (
          <>
            <Check className="w-5 h-5" />
            Done!
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate {treatCount} Treats
            {selectedDestinationId && journey.destinations && (
              <span className="opacity-80">
                for {journey.destinations.find(d => d.id === selectedDestinationId)?.name}
              </span>
            )}
          </>
        )}
      </button>

      <p className="text-center text-xs text-[#6B5344] mt-4">
        AI will create personalized treats based on your travelers' interests and destinations
      </p>
    </div>
  );
}
