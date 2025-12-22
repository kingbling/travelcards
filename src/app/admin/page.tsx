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

  // Fetch journeys with destinations and cards
  const { data: journeys, error } = await supabase
    .from("journeys")
    .select(`
      id,
      name,
      recipient_name,
      unique_slug,
      is_published,
      created_at,
      destinations(id),
      cards(id)
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-[#2C1810] mb-2">Your Journeys</h1>
          <p className="text-[#6B5344]">Create and manage travel experiences for your loved ones</p>
        </div>
        <Link
          href="/admin/journeys/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="w-5 h-5" />
          New Journey
        </Link>
      </div>

      {/* Journeys Grid */}
      {journeys && journeys.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {journeys.map((journey) => {
            // Check if journey setup is incomplete (no destinations)
            const isIncomplete = !journey.destinations || journey.destinations.length === 0;

            return (
              <div
                key={journey.id}
                className={`bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden ${
                  isIncomplete ? "border-2 border-amber-300" : ""
                }`}
              >
                {/* Header */}
                <div className="p-6 border-b border-[#E5DDD5]">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="font-serif text-xl text-[#2C1810]">{journey.name}</h2>
                    {isIncomplete ? (
                      <span className="px-2 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Incomplete
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          journey.is_published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {journey.is_published ? "Published" : "Draft"}
                      </span>
                    )}
                  </div>
                  <p className="text-[#6B5344]">For: {journey.recipient_name || "Not set"}</p>
                </div>

                {/* Stats */}
                <div className="px-6 py-4 grid grid-cols-2 gap-4 bg-[#FDF8F3]">
                  <div className="flex items-center gap-2 text-sm text-[#6B5344]">
                    <MapPin className="w-4 h-4" />
                    <span>{journey.destinations?.length ?? 0} destinations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#6B5344]">
                    <Sparkles className="w-4 h-4" />
                    <span>{journey.cards?.length ?? 0} cards</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 flex items-center gap-2">
                  {isIncomplete ? (
                    <Link
                      href={`/admin/journeys/${journey.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
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
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#E5DDD5] rounded-lg text-sm font-medium text-[#6B5344] hover:bg-[#FDF8F3] transition-colors"
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
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center">
            <MapPin className="w-10 h-10 text-[#C9A227]" />
          </div>
          <h2 className="font-serif text-2xl text-[#2C1810] mb-2">No journeys yet</h2>
          <p className="text-[#6B5344] mb-8 max-w-md mx-auto">
            Create your first journey to start crafting magical travel experiences for your loved ones.
          </p>
          <Link
            href="/admin/journeys/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full font-medium shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Your First Journey
          </Link>
        </div>
      )}
    </div>
  );
}
