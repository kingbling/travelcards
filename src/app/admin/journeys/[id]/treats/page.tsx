"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Trash2, Sparkles, Plus, X, AlertTriangle } from "lucide-react";
import type { Treat } from "@/types/database";

export default function TreatsPage() {
  const params = useParams();
  const journeyId = params.id as string;
  const supabase = createClient();

  const [treats, setTreats] = useState<Treat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  });

  useEffect(() => {
    loadTreats();
  }, [journeyId]);

  const loadTreats = async () => {
    setIsLoading(true);

    const { data } = await supabase
      .from("treats")
      .select("*")
      .eq("journey_id", journeyId)
      .order("order_index", { ascending: true });

    if (data) {
      // Map to Treat type (destination_id will be null since column doesn't exist)
      setTreats(data.map(t => ({ ...t, destination_id: null })) as Treat[]);
    }

    setIsLoading(false);
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
    const unrevealedCount = treats.filter((t) => !t.is_revealed).length;

    if (unrevealedCount === 0) {
      alert("No unrevealed treats to delete.");
      return;
    }

    if (!confirm(`Delete all ${unrevealedCount} unrevealed treats? This cannot be undone.`)) {
      return;
    }

    setIsDeletingAll(true);

    const { error } = await supabase
      .from("treats")
      .delete()
      .eq("journey_id", journeyId)
      .eq("is_revealed", false);

    if (!error) {
      setTreats(treats.filter((t) => t.is_revealed));
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
      setTreats([...treats, { ...data, destination_id: null } as Treat]);
      setShowCreateForm(false);
      setNewTreat({
        name: "",
        description: "",
        category: "culture",
        rarity: "common",
        estimated_cost: "Free",
      });
    }

    setIsCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-[#E07B39] border-t-transparent rounded-full" />
      </div>
    );
  }

  const revealedCount = treats.filter((t) => t.is_revealed).length;
  const unrevealedCount = treats.length - revealedCount;

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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-[#2C1810] mb-2">Treats</h1>
          <p className="text-[#6B5344]">Small surprises for your recipient</p>
          <p className="text-sm text-[#6B5344] mt-1">
            {treats.length} total • {revealedCount} revealed • {unrevealedCount} pending
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {unrevealedCount > 0 && (
            <button
              onClick={handleDeleteAllUnrevealed}
              disabled={isDeletingAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeletingAll ? "Deleting..." : `Delete ${unrevealedCount} Unrevealed`}
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5DDD5] text-[#2C1810] rounded-lg text-sm font-medium hover:border-[#C9A227] hover:bg-[#FAF0E6]/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Custom
          </button>
          <Link
            href={`/admin/journeys/${journeyId}/treats/generate`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium hover:shadow-md hover:shadow-[#E07B39]/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </Link>
        </div>
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
      {treats.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-[#E5DDD5]">
          <span className="text-6xl mb-4 block">🎁</span>
          <h2 className="font-serif text-2xl text-[#2C1810] mb-2">
            No treats yet
          </h2>
          <p className="text-[#6B5344] mb-6">
            Generate treats with AI or create your own custom treats
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5DDD5] text-[#2C1810] rounded-lg text-sm font-medium hover:border-[#C9A227] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Custom
            </button>
            <Link
              href={`/admin/journeys/${journeyId}/treats/generate`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium hover:shadow-md hover:shadow-[#E07B39]/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {treats.map((treat) => (
            <div
              key={treat.id}
              className={`bg-white rounded-xl p-5 shadow-sm border transition-all ${
                treat.is_revealed
                  ? "border-[#C9A227]/30 bg-[#FAF0E6]/30"
                  : "border-[#E5DDD5] hover:border-[#C9A227]/50"
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg text-[#2C1810] mb-1 truncate">
                    {treat.name}
                  </h3>
                  {/* Treat Meta */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B5344]">
                    {treat.estimated_cost && (
                      <span className="px-2 py-0.5 bg-[#FAF0E6] rounded">{treat.estimated_cost}</span>
                    )}
                    {treat.category && (
                      <span className="px-2 py-0.5 bg-[#FAF0E6] rounded capitalize">{treat.category}</span>
                    )}
                    {treat.rarity && (
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
