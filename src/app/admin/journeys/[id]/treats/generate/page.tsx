"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Loader2,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  DollarSign,
  Brain,
  Globe,
  Terminal,
  Database,
  FileText,
  Clock,
} from "lucide-react";
import { CATEGORY_CONFIG, RARITY_CONFIG } from "@/types/database";
import type { CardCategory, Rarity } from "@/types/database";

interface Destination {
  id: string;
  name: string;
  country: string | null;
  start_date: string | null;
}

interface Journey {
  id: string;
  name: string;
  recipient_name: string | null;
  destinations: Destination[];
}

interface GeneratedTreat {
  name: string;
  description: string;
  category: CardCategory;
  rarity: Rarity;
  estimatedCost: string | null;
  pictureUrl: string | null;
  selected: boolean;
}

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
}

type Step = "select" | "preview" | "generating" | "review";

export default function GenerateTreatsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const journeyId = params.id as string;
  const supabase = createClient();

  // Get destination from URL if provided
  const urlDestinationId = searchParams.get("destination");

  const [journey, setJourney] = useState<Journey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<Step>("select");
  const [selectedDestination, setSelectedDestination] = useState<Destination | "global" | null>(null);
  const [treatCount, setTreatCount] = useState(5);
  const [generatedTreats, setGeneratedTreats] = useState<GeneratedTreat[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [thinking, setThinking] = useState<string | null>(null);
  const [streamingOutput, setStreamingOutput] = useState<string>("");
  const [fullPrompt, setFullPrompt] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<{ timestamp: string; level: string; source: string; message: string }[]>([]);
  const [showThinking, setShowThinking] = useState(false);
  const [showConsoleLogs, setShowConsoleLogs] = useState(true); // Default to Console tab
  const [showInputData, setShowInputData] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
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
          destinations(id, name, country, start_date)
        `)
        .eq("id", journeyId)
        .single();

      if (!error && data) {
        // Sort destinations by start_date
        const journeyData = data as unknown as Journey;
        journeyData.destinations = journeyData.destinations.sort((a, b) => {
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        });
        setJourney(journeyData);

        // Auto-select destination from URL if provided
        if (urlDestinationId) {
          const dest = journeyData.destinations.find(d => d.id === urlDestinationId);
          if (dest) {
            setSelectedDestination(dest);
            setStep("preview");
          }
        }
      }
      setIsLoading(false);
    };

    loadJourney();
  }, [journeyId, supabase, urlDestinationId]);

  // Elapsed time timer during generation
  useEffect(() => {
    if (step !== "generating" || !generationStartTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - generationStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [step, generationStartTime]);

  // Handle destination selection
  const handleSelectDestination = (dest: Destination | "global") => {
    setSelectedDestination(dest);
    setStep("preview");
  };

  // Format elapsed time as mm:ss
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle generation with SSE streaming
  const handleGenerate = async () => {
    setStep("generating");
    setError(null);
    setThinking("");
    setStreamingOutput("");
    setFullPrompt(null);
    setConsoleLogs([]);
    setShowConsoleLogs(true);
    setShowInputData(false);
    setShowOutput(false);
    setGenerationStartTime(Date.now());
    setElapsedTime(0);

    try {
      const res = await fetch(`/api/admin/journeys/${journeyId}/treats/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: treatCount,
          destinationId: selectedDestination === "global" ? null : selectedDestination?.id || null,
          stream: true,
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
      let receivedComplete = false;

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

              if (data.type === "log") {
                setConsoleLogs(prev => [...prev, {
                  timestamp: data.timestamp,
                  level: data.level,
                  source: data.source,
                  message: data.message,
                }]);
              } else if (data.type === "init") {
                setFullPrompt(data.prompt);
              } else if (data.type === "thinking") {
                setThinking(prev => (prev || "") + data.content);
              } else if (data.type === "output") {
                setStreamingOutput(prev => prev + data.content);
              } else if (data.type === "heartbeat") {
                // Connection kept alive
              } else if (data.type === "complete") {
                receivedComplete = true;
                const treats = data.treats.map((t: GeneratedTreat) => ({ ...t, selected: true }));
                setGeneratedTreats(treats);
                setUsage(data.usage);
                setStep("review");
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseErr) {
              // Skip malformed SSE events but don't break loop
              if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                console.error("SSE parse error:", parseErr);
              }
            }
          }
        }
      }

      // Check if we completed successfully
      if (!receivedComplete) {
        throw new Error("Stream ended unexpectedly without completion. The AI may have timed out.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("preview");
    }
  };

  // Toggle treat selection
  const handleToggleTreat = (index: number) => {
    setGeneratedTreats(treats =>
      treats.map((t, i) => i === index ? { ...t, selected: !t.selected } : t)
    );
  };

  // Handle saving selected treats
  const handleSaveTreats = async () => {
    const selectedTreats = generatedTreats.filter(t => t.selected);
    if (selectedTreats.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/journeys/${journeyId}/treats/generate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationId: selectedDestination === "global" ? null : selectedDestination?.id || null,
          treats: selectedTreats,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Save failed");
      }

      // Redirect to treats page
      router.push(`/admin/journeys/${journeyId}/treats`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = generatedTreats.filter(t => t.selected).length;

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
        href={`/admin/journeys/${journeyId}/treats`}
        className="inline-flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to treats
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E07B39] to-[#C9A227] flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-3xl text-[#2C1810]">Generate Treats</h1>
            <p className="text-[#6B5344]">{journey.name}</p>
          </div>
        </div>
      </div>

      {/* Step 1: Select Destination */}
      {step === "select" && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl text-[#2C1810] mb-4">
            Where should these treats be available?
          </h2>

          {/* Global option */}
          <button
            onClick={() => handleSelectDestination("global")}
            className="w-full bg-white rounded-xl p-6 shadow-sm border border-[#E5DDD5] text-left hover:border-[#C9A227] hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A227]/20 to-[#E07B39]/20 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-[#C9A227]" />
                </div>
                <div>
                  <h3 className="font-medium text-[#2C1810] text-lg">Journey-wide (Global)</h3>
                  <p className="text-sm text-[#6B5344]">
                    Treats available throughout the entire journey
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#6B5344] group-hover:text-[#C9A227] transition-colors" />
            </div>
          </button>

          {/* Destination options */}
          {journey.destinations.length > 0 && (
            <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5DDD5]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#FDF8F3] px-4 text-sm text-[#6B5344]">or for a specific destination</span>
                </div>
              </div>

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
                          <p className="text-sm text-[#6B5344]">{dest.country}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#6B5344] group-hover:text-[#C9A227] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && selectedDestination && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-[#6B5344]">
            <button onClick={() => setStep("select")} className="hover:text-[#2C1810]">
              Destination
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#2C1810] font-medium">
              {selectedDestination === "global" ? "Journey-wide" : selectedDestination.name}
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#E5DDD5] overflow-hidden">
            <div className="p-4 border-b border-[#E5DDD5]">
              <h2 className="font-serif text-xl text-[#2C1810]">Generation Settings</h2>
            </div>

            <div className="p-6">
              {/* Destination info */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-[#FDF8F3] rounded-lg">
                {selectedDestination === "global" ? (
                  <>
                    <Globe className="w-5 h-5 text-[#C9A227]" />
                    <div>
                      <p className="font-medium text-[#2C1810]">Journey-wide treats</p>
                      <p className="text-sm text-[#6B5344]">Available throughout the entire journey</p>
                    </div>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5 text-[#E07B39]" />
                    <div>
                      <p className="font-medium text-[#2C1810]">{selectedDestination.name}</p>
                      <p className="text-sm text-[#6B5344]">{selectedDestination.country}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Treat count selector */}
              <div>
                <label className="block text-sm text-[#6B5344] mb-3">Number of treats to generate:</label>
                <div className="flex items-center gap-2">
                  {[3, 5, 8, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setTreatCount(n)}
                      className={`w-12 h-12 rounded-lg text-sm font-medium transition-colors ${
                        treatCount === n
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
                Generate {treatCount} Treats
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
              <h2 className="font-serif text-xl text-[#2C1810]">
                Generating treats for {selectedDestination === "global" ? "entire journey" : (selectedDestination as Destination)?.name}
              </h2>
              <p className="text-sm text-[#6B5344]">AI is thinking about personalized treats...</p>
            </div>
            {/* Elapsed Time */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FDF8F3] rounded-lg">
              <Clock className="w-4 h-4 text-[#6B5344]" />
              <span className="text-sm font-mono text-[#2C1810]">{formatElapsedTime(elapsedTime)}</span>
            </div>
          </div>

          {/* Tabs for Console, Input, Thinking, Output */}
          <div className="bg-white rounded-xl border border-[#E5DDD5] overflow-hidden">
            <div className="flex border-b border-[#E5DDD5]">
              <button
                onClick={() => { setShowInputData(false); setShowConsoleLogs(true); setShowOutput(false); }}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  showConsoleLogs
                    ? "bg-[#2C1810] text-white"
                    : "text-[#6B5344] hover:bg-[#FDF8F3]"
                }`}
              >
                <Terminal className="w-4 h-4" />
                Console
                {consoleLogs.length > 0 && (
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{consoleLogs.length}</span>
                )}
              </button>
              <button
                onClick={() => { setShowInputData(true); setShowConsoleLogs(false); setShowOutput(false); }}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  showInputData
                    ? "bg-[#2C1810] text-white"
                    : "text-[#6B5344] hover:bg-[#FDF8F3]"
                }`}
              >
                <Database className="w-4 h-4" />
                Input
              </button>
              <button
                onClick={() => { setShowInputData(false); setShowConsoleLogs(false); setShowOutput(false); }}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  !showInputData && !showConsoleLogs && !showOutput
                    ? "bg-[#2C1810] text-white"
                    : "text-[#6B5344] hover:bg-[#FDF8F3]"
                }`}
              >
                <Brain className="w-4 h-4" />
                Thinking
              </button>
              <button
                onClick={() => { setShowInputData(false); setShowConsoleLogs(false); setShowOutput(true); }}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  showOutput
                    ? "bg-[#2C1810] text-white"
                    : "text-[#6B5344] hover:bg-[#FDF8F3]"
                }`}
              >
                <FileText className="w-4 h-4" />
                Output
                {streamingOutput && (
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{Math.round(streamingOutput.length / 1000)}k</span>
                )}
              </button>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto bg-[#1a1a1a]">
              {showOutput ? (
                <pre className="whitespace-pre-wrap text-sm text-blue-400 font-mono leading-relaxed">
                  {streamingOutput || "Waiting for AI to generate output..."}
                </pre>
              ) : showConsoleLogs ? (
                <div className="font-mono text-xs space-y-1">
                  {consoleLogs.length === 0 ? (
                    <span className="text-gray-500">Waiting for logs...</span>
                  ) : (
                    consoleLogs.map((log, i) => {
                      const time = new Date(log.timestamp).toLocaleTimeString();
                      const levelColor = log.level === "error" ? "text-red-400" :
                                        log.level === "warn" ? "text-yellow-400" : "text-gray-400";
                      const sourceColor = log.source === "AI" ? "text-purple-400" :
                                         log.source === "TREATS" ? "text-orange-400" : "text-cyan-400";
                      return (
                        <div key={i} className="flex gap-2">
                          <span className="text-gray-600">[{time}]</span>
                          <span className={levelColor}>{log.level.toUpperCase().padEnd(5)}</span>
                          <span className={sourceColor}>[{log.source}]</span>
                          <span className="text-gray-300">{log.message}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : showInputData ? (
                <pre className="whitespace-pre-wrap text-sm text-cyan-400 font-mono leading-relaxed">
                  {fullPrompt || "Waiting for prompt data..."}
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

      {/* Step 4: Review Generated Treats */}
      {step === "review" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl text-[#2C1810]">
                Generated {generatedTreats.length} Treats
              </h2>
              <p className="text-[#6B5344]">
                for {selectedDestination === "global" ? "entire journey" : (selectedDestination as Destination)?.name}
              </p>
            </div>
            <button
              onClick={() => {
                setGeneratedTreats([]);
                setThinking(null);
                setStep("preview");
              }}
              className="flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810]"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>

          {/* AI Reasoning - Collapsible */}
          {thinking && (
            <div className="bg-white rounded-xl border border-[#E5DDD5] overflow-hidden">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#FDF8F3] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-4 h-4 text-[#6B5344]" />
                  <span className="font-medium text-[#2C1810]">AI Reasoning</span>
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
                  <div className="p-4 max-h-60 overflow-y-auto bg-[#1a1a1a]">
                    <pre className="whitespace-pre-wrap text-sm text-green-400 font-mono leading-relaxed">
                      {thinking}
                    </pre>
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

          {/* Selection info */}
          <div className="flex items-center justify-between p-3 bg-[#FDF8F3] rounded-lg">
            <span className="text-sm text-[#6B5344]">
              {selectedCount} of {generatedTreats.length} treats selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setGeneratedTreats(treats => treats.map(t => ({ ...t, selected: true })))}
                className="text-xs text-[#E07B39] hover:underline"
              >
                Select all
              </button>
              <span className="text-[#E5DDD5]">|</span>
              <button
                onClick={() => setGeneratedTreats(treats => treats.map(t => ({ ...t, selected: false })))}
                className="text-xs text-[#6B5344] hover:underline"
              >
                Deselect all
              </button>
            </div>
          </div>

          {/* Treats grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {generatedTreats.map((treat, index) => (
              <button
                key={index}
                onClick={() => handleToggleTreat(index)}
                className={`bg-white rounded-xl shadow-sm border text-left transition-all overflow-hidden ${
                  treat.selected
                    ? "border-[#C9A227] ring-2 ring-[#C9A227]/20"
                    : "border-[#E5DDD5] opacity-60 hover:opacity-100"
                }`}
              >
                <div className="flex">
                  {/* Image or Category Icon */}
                  {treat.pictureUrl ? (
                    <div className="w-24 h-24 flex-shrink-0 bg-gray-100">
                      <img
                        src={treat.pictureUrl}
                        alt={treat.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-24 h-24 flex-shrink-0 flex items-center justify-center text-3xl"
                      style={{ backgroundColor: RARITY_CONFIG[treat.rarity]?.bgColor || "#FDF8F3" }}
                    >
                      {CATEGORY_CONFIG[treat.category]?.icon || "🎁"}
                    </div>
                  )}

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-[#2C1810] line-clamp-1">{treat.name}</h3>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        treat.selected
                          ? "border-[#C9A227] bg-[#C9A227]"
                          : "border-[#E5DDD5] bg-white"
                      }`}>
                        {treat.selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    <p className="text-sm text-[#6B5344] line-clamp-2 mb-2">{treat.description}</p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B5344]">
                      {(treat.rarity === "rare" || treat.rarity === "legendary") && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: RARITY_CONFIG[treat.rarity]?.bgColor || "#f5f5f5",
                            color: RARITY_CONFIG[treat.rarity]?.color || "#666",
                          }}
                        >
                          {RARITY_CONFIG[treat.rarity]?.label || treat.rarity}
                        </span>
                      )}
                      {treat.estimatedCost && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {treat.estimatedCost}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {generatedTreats.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD5]">
              <p className="text-[#6B5344]">No treats generated. Try regenerating.</p>
            </div>
          )}

          {generatedTreats.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#E5DDD5]">
              <button
                onClick={() => {
                  setGeneratedTreats([]);
                  setStep("select");
                }}
                className="px-4 py-2 text-[#6B5344] hover:text-[#2C1810]"
              >
                Discard All
              </button>
              <button
                onClick={handleSaveTreats}
                disabled={isSaving || selectedCount === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Save {selectedCount} Treats
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
