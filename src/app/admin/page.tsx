import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, MapPin, Eye, Settings, Sparkles, AlertCircle } from "lucide-react";

// Prevent caching - always fetch fresh data
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // User should be authenticated (layout handles redirect)
  if (!user) {
    return null;
  }

  // Fetch journeys with destinations and cards (cards are nested through destinations)
  const { data: journeys, error } = await supabase
    .from("journeys")
    .select(`
      id,
      name,
      recipient_name,
      unique_slug,
      is_published,
      created_at,
      destinations(id, cards(id))
    `)
    .eq("curator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching journeys:", error);
  }

  return (
    <div>
      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="font-medium">Error loading journeys</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl sm:text-3xl text-[#2C1810] mb-2 break-words">Your Journeys</h1>
          <p className="text-sm sm:text-base text-[#6B5344] break-words">Create and manage travel experiences for your loved ones</p>
        </div>
        <Link
          href="/admin/journeys/new"
          className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full text-sm sm:text-base font-medium shadow-lg hover:shadow-xl transition-shadow whitespace-nowrap flex-shrink-0"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          New Journey
        </Link>
      </div>

      {/* Journeys Grid */}
      {journeys && journeys.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {journeys.map((journey) => {
            // Check if journey setup is incomplete (no destinations)
            const isIncomplete = !journey.destinations || journey.destinations.length === 0;
            // Count total cards across all destinations
            const totalCards = journey.destinations?.reduce(
              (sum, dest) => sum + (dest.cards?.length ?? 0),
              0
            ) ?? 0;

            return (
              <div
                key={journey.id}
                className={`bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden ${
                  isIncomplete ? "border-2 border-amber-300" : ""
                }`}
              >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-[#E5DDD5]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="font-serif text-lg sm:text-xl text-[#2C1810] break-words flex-1 min-w-0">{journey.name}</h2>
                    {isIncomplete ? (
                      <span className="px-2 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                        <AlertCircle className="w-3 h-3" />
                        <span className="hidden sm:inline">Incomplete</span>
                        <span className="sm:hidden">!</span>
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 whitespace-nowrap ${
                          journey.is_published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {journey.is_published ? "Published" : "Draft"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-[#6B5344] break-words">For: {journey.recipient_name || "Not set"}</p>
                </div>

                {/* Stats */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 grid grid-cols-2 gap-3 sm:gap-4 bg-[#FDF8F3]">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-[#6B5344] min-w-0">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{journey.destinations?.length ?? 0} destinations</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-[#6B5344] min-w-0">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{totalCards} cards</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {isIncomplete ? (
                    <Link
                      href={`/admin/journeys/${journey.id}/edit`}
                      className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Continue Setup
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/admin/journeys/${journey.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2C1810] text-white rounded-lg text-sm font-medium hover:bg-[#3D2920] transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Manage
                      </Link>
                      <Link
                        href={`/j/${journey.unique_slug}`}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#E5DDD5] rounded-lg text-sm font-medium text-[#6B5344] hover:bg-[#FDF8F3] transition-colors whitespace-nowrap"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl shadow-sm px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center">
            <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-[#C9A227]" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl text-[#2C1810] mb-2">No journeys yet</h2>
          <p className="text-sm sm:text-base text-[#6B5344] mb-6 sm:mb-8 max-w-md mx-auto break-words">
            Create your first journey to start crafting magical travel experiences for your loved ones.
          </p>
          <Link
            href="/admin/journeys/new"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full text-sm sm:text-base font-medium shadow-lg"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Create Your First Journey
          </Link>
        </div>
      )}
    </div>
  );
}
