"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Trash2, Sparkles, Plus, X, MapPin, Globe, ChevronDown } from "lucide-react";
import type { Treat, Destination } from "@/types/database";

export default function TreatsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const journeyId = params.id as string;
  const supabase = createClient();

  // Get initial destination from URL query param
  const initialDestination = searchParams.get("destination") || "all";

  const [treats, setTreats] = useState<Treat[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [journeyName, setJourneyName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<string>(initialDestination);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTreat, setNewTreat] = useState({
    name: "",
    description: "",
    category: "culture",
    rarity: "common",
    estimated_cost: "Free",
    destination_id: initialDestination === "all" || initialDestination === "global" ? "" : initialDestination,
  });

  useEffect(() => {
    loadData();
  }, [journeyId]);

  const loadData = async () => {
    setIsLoading(true);

    // Load journey with destinations
    const { data: journeyData } = await supabase
      .from("journeys")
      .select(`
        name,
        destinations(id, name, country, start_date)
      `)
      .eq("id", journeyId)
      .single();

    if (journeyData) {
      setJourneyName(journeyData.name);
      // Sort destinations by start_date
      const sortedDests = (journeyData.destinations as Destination[] || []).sort((a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
      setDestinations(sortedDests);
    }

    // Load treats
    const { data: treatsData } = await supabase
      .from("treats")
      .select("*")
      .eq("journey_id", journeyId)
      .order("order_index", { ascending: true });

    if (treatsData) {
      setTreats(treatsData as Treat[]);
    }

    setIsLoading(false);
  };

  // Handle destination change and update URL
  const handleDestinationChange = (destId: string) => {
    setSelectedDestination(destId);
    const newUrl = destId === "all"
      ? `/admin/journeys/${journeyId}/treats`
      : `/admin/journeys/${journeyId}/treats?destination=${destId}`;
    router.push(newUrl, { scroll: false });
  };

  // Filter treats based on selected destination
  const filteredTreats = treats.filter(treat => {
    if (selectedDestination === "all") return true;
    if (selectedDestination === "global") return !treat.destination_id;
    return treat.destination_id === selectedDestination;
  });

  const filteredStats = {
    total: filteredTreats.length,
    revealed: filteredTreats.filter(t => t.is_revealed).length,
    unrevealed: filteredTreats.filter(t => !t.is_revealed).length,
  };

  const handleDelete = async (treatId: string) => {
    const treat = treats.find((t) => t.id === treatId);
    if (treat?.is_revealed) {
      alert("Cannot delete a revealed treat.");
      return;
    }

    if (!confirm("Delete this treat? This cannot be undone.")) {
      return;
    }

    setDeletingId(treatId);

    const { error } = await supabase
      .from("treats")
      .delete()
      .eq("id", treatId)
      .eq("is_revealed", false);

    if (!error) {
      setTreats(treats.filter((t) => t.id !== treatId));
    } else {
      alert("Failed to delete treat. It may have been revealed.");
    }

    setDeletingId(null);
  };

  const handleDeleteAllUnrevealed = async () => {
    const unrevealedTreats = filteredTreats.filter((t) => !t.is_revealed);

    if (unrevealedTreats.length === 0) {
      alert("No unrevealed treats to delete.");
      return;
    }

    if (!confirm(`Delete ${unrevealedTreats.length} unrevealed treats? This cannot be undone.`)) {
      return;
    }

    setIsDeletingAll(true);

    // Delete each unrevealed treat in the filtered list
    const idsToDelete = unrevealedTreats.map(t => t.id);
    const { error } = await supabase
      .from("treats")
      .delete()
      .in("id", idsToDelete);

    if (!error) {
      setTreats(treats.filter((t) => !idsToDelete.includes(t.id)));
    } else {
      alert("Failed to delete treats.");
    }

    setIsDeletingAll(false);
  };

  const handleCreateTreat = async () => {
    if (!newTreat.name.trim() || !newTreat.description.trim()) {
      alert("Please fill in name and description");
      return;
    }

    setIsCreating(true);

    // Get max order_index
    const maxOrderIndex = treats.length > 0
      ? Math.max(...treats.map((t) => t.order_index || 0))
      : -1;

    const { data, error } = await supabase
      .from("treats")
      .insert({
        journey_id: journeyId,
        destination_id: newTreat.destination_id || null,
        name: newTreat.name,
        description: newTreat.description,
        category: newTreat.category,
        rarity: newTreat.rarity,
        estimated_cost: newTreat.estimated_cost,
        order_index: maxOrderIndex + 1,
        is_revealed: false,
      })
      .select()
      .single();

    if (!error && data) {
      setTreats([...treats, data as Treat]);
      setShowCreateForm(false);
      setNewTreat({
        name: "",
        description: "",
        category: "culture",
        rarity: "common",
        estimated_cost: "Free",
        destination_id: selectedDestination === "all" || selectedDestination === "global" ? "" : selectedDestination,
      });
    }

    setIsCreating(false);
  };

  // Helper to get destination name
  const getDestinationName = (destId: string | null) => {
    if (!destId) return "Journey-wide";
    return destinations.find(d => d.id === destId)?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-[#E07B39] border-t-transparent rounded-full" />
      </div>
    );
  }

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
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">Treats</h1>
        <p className="text-[#6B5344]">{journeyName}</p>
      </div>

      {/* Destination Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E5DDD5] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[#C9A227]" />
            <div className="relative">
              <select
                value={selectedDestination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                className="appearance-none bg-[#FAF0E6] px-4 py-2 pr-10 rounded-lg text-[#2C1810] font-medium focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 cursor-pointer"
              >
                <option value="all">All Treats</option>
                <option value="global">Journey-wide (Global)</option>
                {destinations.map(dest => (
                  <option key={dest.id} value={dest.id}>
                    {dest.name}{dest.country ? `, ${dest.country}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5344] pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-[#6B5344]">
            <span>{filteredStats.total} treats</span>
            {filteredStats.revealed > 0 && (
              <span className="text-blue-600">{filteredStats.revealed} revealed</span>
            )}
            {filteredStats.unrevealed > 0 && (
              <span className="text-[#E07B39]">{filteredStats.unrevealed} unrevealed</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={selectedDestination !== "all" && selectedDestination !== "global"
              ? `/admin/journeys/${journeyId}/treats/generate?destination=${selectedDestination}`
              : `/admin/journeys/${journeyId}/treats/generate`
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate Treats
          </Link>
          <button
            onClick={() => {
              setNewTreat({
                ...newTreat,
                destination_id: selectedDestination === "all" || selectedDestination === "global" ? "" : selectedDestination,
              });
              setShowCreateForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5DDD5] text-[#2C1810] rounded-lg text-sm font-medium hover:border-[#C9A227] hover:bg-[#FAF0E6]/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Custom
          </button>
        </div>

        {filteredStats.unrevealed > 0 && (
          <button
            onClick={handleDeleteAllUnrevealed}
            disabled={isDeletingAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isDeletingAll ? "Deleting..." : `Delete ${filteredStats.unrevealed} Unrevealed`}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-[#E5DDD5]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-[#2C1810]">Create Custom Treat</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1.5 hover:bg-[#FAF0E6] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#6B5344]" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-2">
                Name *
              </label>
              <input
                type="text"
                value={newTreat.name}
                onChange={(e) => setNewTreat({ ...newTreat, name: e.target.value })}
                placeholder="e.g., Get a Thai massage"
                className="w-full px-4 py-2.5 rounded-lg border border-[#E5DDD5] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 focus:border-[#C9A227]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-2">
                Description *
              </label>
              <textarea
                value={newTreat.description}
                onChange={(e) => setNewTreat({ ...newTreat, description: e.target.value })}
                placeholder="Describe the treat and why it's special..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-[#E5DDD5] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 focus:border-[#C9A227]"
              />
            </div>

            {/* Destination selector */}
            <div>
              <label className="block text-sm font-medium text-[#2C1810] mb-2">
                Destination
              </label>
              <select
                value={newTreat.destination_id}
                onChange={(e) => setNewTreat({ ...newTreat, destination_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-[#E5DDD5] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 focus:border-[#C9A227]"
              >
                <option value="">Journey-wide (Global)</option>
                {destinations.map(dest => (
                  <option key={dest.id} value={dest.id}>
                    {dest.name}{dest.country ? `, ${dest.country}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#6B5344] mt-1">
                Journey-wide treats are always available. Destination treats are tied to a specific location.
              </p>
            </div>

            {/* Meta fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Category
                </label>
                <select
                  value={newTreat.category}
                  onChange={(e) => setNewTreat({ ...newTreat, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5DDD5] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 focus:border-[#C9A227]"
                >
                  <option value="culture">Culture</option>
                  <option value="food">Food</option>
                  <option value="spa">Spa</option>
                  <option value="nature">Nature</option>
                  <option value="adventure">Adventure</option>
                  <option value="art">Art</option>
                  <option value="music">Music</option>
                  <option value="family">Family</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Rarity
                </label>
                <select
                  value={newTreat.rarity}
                  onChange={(e) => setNewTreat({ ...newTreat, rarity: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5DDD5] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 focus:border-[#C9A227]"
                >
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-2">
                  Cost
                </label>
                <input
                  type="text"
                  value={newTreat.estimated_cost}
                  onChange={(e) => setNewTreat({ ...newTreat, estimated_cost: e.target.value })}
                  placeholder="Free, $10, etc."
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5DDD5] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50 focus:border-[#C9A227]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2.5 border border-[#E5DDD5] text-[#6B5344] rounded-lg font-medium hover:border-[#C9A227] hover:text-[#2C1810] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTreat}
                disabled={isCreating}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg font-medium hover:shadow-md hover:shadow-[#E07B39]/20 transition-all disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Treat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treats List */}
      {filteredTreats.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-[#E5DDD5]">
          <span className="text-6xl mb-4 block">🎁</span>
          <h2 className="font-serif text-2xl text-[#2C1810] mb-2">
            {selectedDestination !== "all" ? "No treats for this selection" : "No treats yet"}
          </h2>
          <p className="text-[#6B5344] mb-6">
            Generate treats with AI or create your own custom treats
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => {
                setNewTreat({
                  ...newTreat,
                  destination_id: selectedDestination === "all" || selectedDestination === "global" ? "" : selectedDestination,
                });
                setShowCreateForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5DDD5] text-[#2C1810] rounded-lg text-sm font-medium hover:border-[#C9A227] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Custom
            </button>
            <Link
              href={selectedDestination !== "all" && selectedDestination !== "global"
                ? `/admin/journeys/${journeyId}/treats/generate?destination=${selectedDestination}`
                : `/admin/journeys/${journeyId}/treats/generate`
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium hover:shadow-md hover:shadow-[#E07B39]/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTreats.map((treat) => (
            <div
              key={treat.id}
              className={`bg-white rounded-xl p-5 shadow-sm border transition-all ${
                treat.is_revealed
                  ? "border-[#C9A227]/30 bg-[#FAF0E6]/30"
                  : "border-[#E5DDD5] hover:border-[#C9A227]/50"
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg text-[#2C1810] mb-1 truncate">
                    {treat.name}
                  </h3>
                  {/* Destination badge */}
                  <div className="flex items-center gap-1.5 text-xs text-[#6B5344] mb-2">
                    {treat.destination_id ? (
                      <>
                        <MapPin className="w-3 h-3" />
                        <span>{getDestinationName(treat.destination_id)}</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3" />
                        <span>Journey-wide</span>
                      </>
                    )}
                  </div>
                  {/* Treat Meta */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B5344]">
                    {treat.estimated_cost && (
                      <span className="px-2 py-0.5 bg-[#FAF0E6] rounded">{treat.estimated_cost}</span>
                    )}
                    {treat.category && (
                      <span className="px-2 py-0.5 bg-[#FAF0E6] rounded capitalize">{treat.category}</span>
                    )}
                    {(treat.rarity === "rare" || treat.rarity === "legendary") && (
                      <span className="px-2 py-0.5 bg-[#FAF0E6] rounded capitalize">{treat.rarity}</span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                {treat.is_revealed ? (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#C9A227]/10 text-[#C9A227] text-xs font-medium">
                    ✓ Revealed
                  </span>
                ) : (
                  <button
                    onClick={() => handleDelete(treat.id)}
                    disabled={deletingId === treat.id}
                    className="flex-shrink-0 p-2 text-[#6B5344] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete treat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Description */}
              {treat.description && (
                <p className="text-sm text-[#6B5344] line-clamp-2">
                  {treat.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
