import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  MapPin,
  Users,
  Sparkles,
  Eye,
  Gift,
  Plus,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { PublishButton, CopyLinkButton } from "@/components/admin/JourneyActions";
import { ResetQuickAction } from "@/components/admin/ResetQuickAction";
import type { Card, Participant, Destination, LoveLetter, Treat } from "@/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

interface JourneyWithRelations {
  id: string;
  name: string;
  recipient_name: string | null;
  unique_slug: string | null;
  access_code: string | null;
  is_published: boolean;
  treats_per_week: number | null;
  participants: Participant[] | null;
  destinations: (Destination & { cards: Card[] | null; treats: Treat[] | null })[] | null;
  love_letters: LoveLetter[] | null;
  treats: Treat[] | null;
}

export default async function JourneyManagePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch journey with all related data (cards are nested through destinations)
  const { data, error } = await supabase
    .from("journeys")
    .select(`
      *,
      participants(*),
      destinations(
        *,
        cards(*),
        treats:treats!destination_id(*)
      ),
      love_letters(*),
      treats!journey_id(*)
    `)
    .eq("id", id)
    .eq("curator_id", user.id)
    .single();

  // Get treat reveals this week for quota calculation
  const getWeekStart = () => {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  };

  const weekStart = getWeekStart();
  const { count: treatRevealsThisWeek } = await supabase
    .from("treat_reveals")
    .select("id", { count: "exact", head: true })
    .eq("journey_id", id)
    .gte("revealed_at", weekStart.toISOString());

  if (error || !data) {
    notFound();
  }

  const journey = data as unknown as JourneyWithRelations;

  // Sort destinations by start_date
  const sortedDestinations = journey.destinations?.sort((a, b) => {
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  }) ?? [];

  // Aggregate all cards from all destinations
  const allCards = sortedDestinations.flatMap((d) => d.cards ?? []);

  // Count cards by status
  const cardStats = {
    total: allCards.length,
    draft: allCards.filter((c) => c.status === "draft").length,
    approved: allCards.filter((c) => c.status === "approved").length,
    revealed: allCards.filter((c) => c.is_revealed).length,
  };

  // Count treats with quota-based "ready" calculation
  const treatsPerWeek = journey.treats_per_week ?? 1;
  const unrevealed = journey.treats?.filter((t) => !t.is_revealed).length ?? 0;
  const treatsRemaining = Math.max(0, treatsPerWeek - (treatRevealsThisWeek ?? 0));
  const treatStats = {
    total: journey.treats?.length ?? 0,
    revealed: journey.treats?.filter((t) => t.is_revealed).length ?? 0,
    ready: Math.min(treatsRemaining, unrevealed), // Can only reveal up to quota remaining
  };

  // Calculate completion status
  const hasDestinations = sortedDestinations.length > 0;
  const destinationsNeedingCards = sortedDestinations.filter((d) => (d.cards?.length ?? 0) === 0);
  const destinationsWithCards = sortedDestinations.filter((d) => (d.cards?.length ?? 0) > 0);
  const hasSchedule = cardStats.approved > 0; // Cards have reveal dates
  const hasNotes = (journey.love_letters?.length ?? 0) > 0;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="font-serif text-3xl text-[#2C1810] break-words">{journey.name}</h1>
            <span
              className={`px-2 py-1 text-xs rounded-full font-medium flex-shrink-0 ${
                journey.is_published
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {journey.is_published ? "Published" : "Draft"}
            </span>
          </div>
          <p className="text-[#6B5344] break-words">For: {journey.recipient_name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
          <Link
            href={`/j/${journey.unique_slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#E5DDD5] rounded-lg text-sm font-medium text-[#6B5344] hover:bg-[#FDF8F3] transition-colors whitespace-nowrap"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Link>
          <PublishButton journeyId={journey.id} isPublished={journey.is_published} />
        </div>
      </div>

      {/* Progress Overview */}
      {!hasDestinations && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-amber-900 mb-1">Get Started: Add Destinations</h3>
              <p className="text-sm text-amber-700 mb-3">
                Start by adding destinations to your journey. Each destination will have its own experience cards and treats.
              </p>
              <Link
                href={`/admin/journeys/${id}/edit?step=3`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Destination
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Journey Settings */}
      <div className="mb-8">
        <h2 className="font-serif text-xl text-[#2C1810] mb-4">Journey Settings</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Schedule */}
          <Link
            href={`/admin/journeys/${id}/schedule`}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-[#E5DDD5]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[#2C1810] break-words">Reveal Schedule</h3>
                {!hasSchedule && cardStats.approved > 0 && (
                  <p className="text-xs text-amber-600">Set reveal dates</p>
                )}
              </div>
            </div>
            <p className="text-sm text-[#6B5344] break-words">
              {hasSchedule ? "Configure reveal timing" : "Set when cards are revealed"}
            </p>
          </Link>

          {/* Personal Notes */}
          <Link
            href={`/admin/journeys/${id}/notes`}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-[#E5DDD5]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">📝</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[#2C1810] break-words">Personal Notes</h3>
                {!hasNotes && (
                  <p className="text-xs text-[#6B5344]">Optional</p>
                )}
              </div>
            </div>
            <p className="text-sm text-[#6B5344] break-words">
              {hasNotes ? `${journey.love_letters?.length} notes added` : "Add heartfelt messages"}
            </p>
          </Link>

          {/* Experience Cards */}
          <Link
            href={`/admin/journeys/${id}/cards`}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-[#E5DDD5]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#E07B39]/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-[#E07B39]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[#2C1810] break-words">Experience Cards</h3>
                <p className="text-xs text-emerald-600">{cardStats.approved} approved</p>
              </div>
            </div>
            <p className="text-sm text-[#6B5344] break-words">
              View, edit, and generate cards
            </p>
          </Link>

          {/* Treats */}
          <Link
            href={`/admin/journeys/${id}/treats`}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-[#E5DDD5]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#C9A227]/10 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-[#C9A227]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[#2C1810] break-words">Treats</h3>
                <p className="text-xs text-emerald-600">
                  {treatStats.total} total{treatStats.ready > 0 && ` • ${treatStats.ready} ready`}
                </p>
              </div>
            </div>
            <p className="text-sm text-[#6B5344] break-words">
              Small surprises for your recipient
            </p>
          </Link>

          {/* Reset Journey */}
          <ResetQuickAction
            journeyId={id}
            revealedCount={cardStats.revealed}
            treatsRevealedCount={treatStats.revealed}
          />
        </div>
      </div>

      {/* Destinations */}
      {hasDestinations && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="font-serif text-xl text-[#2C1810]">Destinations</h2>
            <Link
              href={`/admin/journeys/${journey.id}/edit?step=3`}
              className="text-sm text-[#E07B39] hover:underline flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Destination
            </Link>
          </div>

          <div className="grid gap-4">
            {sortedDestinations.map((dest) => {
              const hasCards = (dest.cards?.length ?? 0) > 0;
              const hasTreats = (dest.treats?.length ?? 0) > 0;
              const approvedCards = dest.cards?.filter((c) => c.status === "approved").length ?? 0;
              const revealedCards = dest.cards?.filter((c) => c.is_revealed).length ?? 0;
              const readyCards = dest.cards?.filter((c) =>
                c.status === "approved" &&
                !c.is_revealed &&
                c.reveal_date &&
                new Date(c.reveal_date) <= new Date()
              ).length ?? 0;
              const revealedTreats = dest.treats?.filter((t) => t.is_revealed).length ?? 0;

              const needsCards = !hasCards;
              const needsTreats = hasCards && !hasTreats;
              const isComplete = hasCards && hasTreats && approvedCards > 0;

              return (
                <div
                  key={dest.id}
                  className={`bg-white rounded-xl p-6 shadow-sm border transition-all ${
                    needsCards
                      ? "border-amber-200 bg-amber-50/30"
                      : needsTreats
                      ? "border-blue-200 bg-blue-50/30"
                      : "border-[#E5DDD5]"
                  }`}
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isComplete
                          ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20"
                          : "bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20"
                      }`}>
                        <MapPin className={`w-6 h-6 ${isComplete ? "text-emerald-600" : "text-[#E07B39]"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-lg text-[#2C1810] mb-1 break-words">{dest.name}</h3>
                        <p className="text-sm text-[#6B5344] break-words">{dest.country}</p>
                        {dest.start_date && (
                          <p className="text-xs text-[#6B5344] mt-1 flex items-center gap-1 flex-wrap">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span className="break-words">{new Date(dest.start_date).toLocaleDateString()} - {dest.end_date ? new Date(dest.end_date).toLocaleDateString() : "..."}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      {needsCards && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium whitespace-nowrap">
                          ⚠️ Needs cards
                        </span>
                      )}
                      {!needsCards && needsTreats && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium whitespace-nowrap">
                          💡 Add treats
                        </span>
                      )}
                      {isComplete && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium whitespace-nowrap">
                          ✓ Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content Stats */}
                  <div className="space-y-2">
                    {/* Cards Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 px-3 bg-[#FAF0E6] rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-4 h-4 text-[#E07B39] flex-shrink-0" />
                        <span className="text-sm text-[#2C1810] break-words">Experience Cards</span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm text-[#6B5344] break-words">
                          {hasCards ? (
                            <>
                              {approvedCards} approved
                              {revealedCards > 0 && <span className="text-blue-600"> • {revealedCards} revealed</span>}
                              {readyCards > 0 && <span className="text-[#E07B39]"> • {readyCards} ready</span>}
                            </>
                          ) : (
                            <span className="text-amber-600">None yet</span>
                          )}
                        </span>
                        <Link
                          href={`/admin/journeys/${id}/cards?destination=${dest.id}`}
                          className="text-sm text-[#E07B39] hover:underline flex items-center gap-1 whitespace-nowrap"
                        >
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Treats Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 px-3 bg-[#FAF0E6] rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Gift className="w-4 h-4 text-[#C9A227] flex-shrink-0" />
                        <span className="text-sm text-[#2C1810] break-words">Treats</span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm text-[#6B5344] break-words">
                          {hasTreats ? (
                            <>
                              {dest.treats?.length} total
                              {revealedTreats > 0 && <span className="text-blue-600"> • {revealedTreats} revealed</span>}
                            </>
                          ) : (
                            <span>None yet</span>
                          )}
                        </span>
                        <Link
                          href={`/admin/journeys/${id}/treats?destination=${dest.id}`}
                          className="text-sm text-[#E07B39] hover:underline flex items-center gap-1 whitespace-nowrap"
                        >
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Edit Link */}
                    <div className="flex justify-end pt-1">
                      <Link
                        href={`/admin/journeys/${journey.id}/edit?step=3`}
                        className="text-sm text-[#6B5344] hover:text-[#E07B39] transition-colors"
                      >
                        Edit destination details →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5DDD5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="font-serif text-xl text-[#2C1810]">Travelers</h2>
          <Link
            href={`/admin/journeys/${journey.id}/edit?step=2`}
            className="text-sm text-[#E07B39] hover:underline flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Traveler
          </Link>
        </div>

        {journey.participants && journey.participants.length > 0 ? (
          <div className="divide-y divide-[#E5DDD5]">
            {journey.participants.map((p) => (
              <div key={p.id} className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-[#2C1810] break-words">{p.name}</h3>
                      {p.is_recipient && (
                        <span className="px-2 py-0.5 text-xs bg-[#E07B39]/10 text-[#E07B39] rounded-full whitespace-nowrap flex-shrink-0">
                          Recipient
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6B5344] break-words">
                      {p.role && <span className="capitalize">{p.role}</span>}
                      {p.age && <span> • {p.age} years old</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
                  {p.interests && p.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.interests.slice(0, 3).map((interest, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs bg-[#FDF8F3] text-[#6B5344] rounded-full break-words"
                        >
                          {interest}
                        </span>
                      ))}
                      {p.interests.length > 3 && (
                        <span className="px-2 py-1 text-xs text-[#6B5344] whitespace-nowrap">
                          +{p.interests.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <Link
                    href={`/admin/journeys/${journey.id}/edit?step=2`}
                    className="text-sm text-[#E07B39] hover:underline whitespace-nowrap"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-[#6B5344]">
            No travelers added yet.{" "}
            <Link
              href={`/admin/journeys/${journey.id}/edit?step=2`}
              className="text-[#E07B39] hover:underline"
            >
              Add travelers
            </Link>
          </div>
        )}
      </div>

      {/* Journey Link */}
      <div className="mt-8 p-4 bg-[#FDF8F3] rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 min-w-0 flex-1">
          <div className="min-w-0">
            <p className="text-sm text-[#6B5344]">Share this link with your recipient:</p>
            <p className="font-mono text-[#2C1810] break-all">
              /j/{journey.unique_slug}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-[#6B5344]">PIN Code:</p>
            <p className="font-mono text-[#2C1810] break-all">
              {journey.access_code || "No PIN set"}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <CopyLinkButton uniqueSlug={journey.unique_slug ?? ""} />
        </div>
      </div>
    </div>
  );
}
