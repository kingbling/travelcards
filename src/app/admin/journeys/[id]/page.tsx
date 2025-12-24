import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  MapPin,
  Users,
  Sparkles,
  Eye,
  Settings,
  Plus,
  Calendar,
  Check,
} from "lucide-react";
import { PublishButton, CopyLinkButton } from "@/components/admin/JourneyActions";
import { ResetQuickAction } from "@/components/admin/ResetQuickAction";
import type { Card, Participant, Destination, Chapter, LoveLetter, Treat } from "@/types/database";

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
  participants: Participant[] | null;
  destinations: (Destination & { chapters: Chapter[] | null; cards: Card[] | null; treats: Treat[] | null })[] | null;
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
        chapters(*),
        cards(*),
        treats:treats!destination_id(*)
      ),
      love_letters(*),
      treats(*)
    `)
    .eq("id", id)
    .eq("curator_id", user.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const journey = data as unknown as JourneyWithRelations;

  // Aggregate all cards from all destinations
  const allCards = journey.destinations?.flatMap((d) => d.cards ?? []) ?? [];

  // Count cards by status
  const cardStats = {
    total: allCards.length,
    draft: allCards.filter((c) => c.status === "draft").length,
    approved: allCards.filter((c) => c.status === "approved").length,
    revealed: allCards.filter((c) => c.is_revealed).length,
  };

  // Count treats
  const treatStats = {
    total: journey.treats?.length ?? 0,
    revealed: journey.treats?.filter((t) => t.is_revealed).length ?? 0,
  };

  // Calculate completion status
  const hasDestinations = (journey.destinations?.length ?? 0) > 0;
  const destinationsNeedingCards = journey.destinations?.filter((d) => (d.cards?.length ?? 0) === 0) ?? [];
  const destinationsWithCards = journey.destinations?.filter((d) => (d.cards?.length ?? 0) > 0) ?? [];
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
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-3xl text-[#2C1810]">{journey.name}</h1>
            <span
              className={`px-2 py-1 text-xs rounded-full font-medium ${
                journey.is_published
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {journey.is_published ? "Published" : "Draft"}
            </span>
          </div>
          <p className="text-[#6B5344]">For: {journey.recipient_name}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/j/${journey.unique_slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#E5DDD5] rounded-lg text-sm font-medium text-[#6B5344] hover:bg-[#FDF8F3] transition-colors"
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Schedule */}
          <Link
            href={`/admin/journeys/${id}/schedule`}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-[#E5DDD5]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#2C1810]">Reveal Schedule</h3>
                {!hasSchedule && cardStats.approved > 0 && (
                  <p className="text-xs text-amber-600">⚠️ Set reveal dates</p>
                )}
              </div>
            </div>
            <p className="text-sm text-[#6B5344]">
              {hasSchedule ? "Configure reveal timing" : "Set when cards are revealed"}
            </p>
          </Link>

          {/* Personal Notes */}
          <Link
            href={`/admin/journeys/${id}/notes`}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-[#E5DDD5]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#2C1810]">Personal Notes</h3>
                {!hasNotes && (
                  <p className="text-xs text-[#6B5344]">Optional</p>
                )}
              </div>
            </div>
            <p className="text-sm text-[#6B5344]">
              {hasNotes ? `${journey.love_letters?.length} notes added` : "Add heartfelt messages"}
            </p>
          </Link>

          {/* View All Cards */}
          <Link
            href={`/admin/journeys/${id}/cards`}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-[#E5DDD5]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#C9A227]/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#C9A227]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-[#2C1810]">All Cards</h3>
                <p className="text-xs text-emerald-600">{cardStats.approved} approved</p>
              </div>
            </div>
            <p className="text-sm text-[#6B5344]">
              View and manage all cards
            </p>
          </Link>

          {/* Reset Journey */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5DDD5]">
            <ResetQuickAction
              journeyId={id}
              revealedCount={cardStats.revealed}
              treatsRevealedCount={treatStats.revealed}
            />
          </div>
        </div>
      </div>

      {/* Destinations */}
      {hasDestinations && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-[#2C1810]">Destinations</h2>
            <Link
              href={`/admin/journeys/${journey.id}/edit?step=3`}
              className="text-sm text-[#E07B39] hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Destination
            </Link>
          </div>

          <div className="grid gap-4">
            {journey.destinations?.map((dest) => {
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
              const readyTreats = dest.treats?.filter((t) => !t.is_revealed).length ?? 0;

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
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isComplete
                          ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20"
                          : "bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20"
                      }`}>
                        <MapPin className={`w-6 h-6 ${isComplete ? "text-emerald-600" : "text-[#E07B39]"}`} />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg text-[#2C1810] mb-1">{dest.name}</h3>
                        <p className="text-sm text-[#6B5344]">{dest.country}</p>
                        {dest.start_date && (
                          <p className="text-xs text-[#6B5344] mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(dest.start_date).toLocaleDateString()} - {dest.end_date ? new Date(dest.end_date).toLocaleDateString() : "..."}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {needsCards && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                          ⚠️ Needs cards
                        </span>
                      )}
                      {!needsCards && needsTreats && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                          💡 Add treats
                        </span>
                      )}
                      {isComplete && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                          ✓ Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content Stats & Actions */}
                  <div className="space-y-3">
                    {/* Cards Section */}
                    <div className="flex items-center justify-between p-3 bg-[#FAF0E6] rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-[#2C1810] mb-1">Experience Cards</p>
                        {hasCards ? (
                          <p className="text-xs text-[#6B5344]">
                            {dest.cards?.length} total • <span className="text-emerald-600">{approvedCards} approved</span>
                            {revealedCards > 0 && <> • <span className="text-blue-600">{revealedCards} revealed</span></>}
                            {readyCards > 0 && <> • <span className="text-[#E07B39] font-medium">{readyCards} ready</span></>}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600">No cards yet - generate to get started</p>
                        )}
                      </div>
                      <Link
                        href={`/admin/journeys/${id}/generate?destination=${dest.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                        {hasCards ? "Generate More" : "Generate Cards"}
                      </Link>
                    </div>

                    {/* Treats Section */}
                    <div className="flex items-center justify-between p-3 bg-[#FAF0E6] rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-[#2C1810] mb-1">🎁 Treats</p>
                        {hasTreats ? (
                          <p className="text-xs text-[#6B5344]">
                            {dest.treats?.length} total
                            {revealedTreats > 0 && <> • <span className="text-blue-600">{revealedTreats} revealed</span></>}
                            {readyTreats > 0 && <> • <span className="text-[#E07B39] font-medium">{readyTreats} ready</span></>}
                          </p>
                        ) : (
                          <p className="text-xs text-[#6B5344]">
                            {hasCards ? "Optional - add small surprises" : "Generate cards first"}
                          </p>
                        )}
                      </div>
                      {hasCards ? (
                        <Link
                          href={`/admin/journeys/${id}/treats/generate?destination=${dest.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-white border border-[#E5DDD5] text-[#2C1810] hover:border-[#C9A227] hover:bg-[#FAF0E6]"
                        >
                          <span className="text-lg">🎁</span>
                          {hasTreats ? "Generate More" : "Generate Treats"}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
                          <span className="text-lg">🎁</span>
                          Generate Treats
                        </span>
                      )}
                    </div>

                    {/* Edit Link */}
                    <div className="flex justify-end">
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
        <div className="p-6 border-b border-[#E5DDD5] flex items-center justify-between">
          <h2 className="font-serif text-xl text-[#2C1810]">Travelers</h2>
          <Link
            href={`/admin/journeys/${journey.id}/edit?step=2`}
            className="text-sm text-[#E07B39] hover:underline flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Traveler
          </Link>
        </div>

        {journey.participants && journey.participants.length > 0 ? (
          <div className="divide-y divide-[#E5DDD5]">
            {journey.participants.map((p) => (
              <div key={p.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[#2C1810]">{p.name}</h3>
                      {p.is_recipient && (
                        <span className="px-2 py-0.5 text-xs bg-[#E07B39]/10 text-[#E07B39] rounded-full">
                          Recipient
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6B5344]">
                      {p.role && <span className="capitalize">{p.role}</span>}
                      {p.age && <span> • {p.age} years old</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {p.interests && p.interests.length > 0 && (
                    <div className="flex gap-1">
                      {p.interests.slice(0, 3).map((interest, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs bg-[#FDF8F3] text-[#6B5344] rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                      {p.interests.length > 3 && (
                        <span className="px-2 py-1 text-xs text-[#6B5344]">
                          +{p.interests.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <Link
                    href={`/admin/journeys/${journey.id}/edit?step=2`}
                    className="text-sm text-[#E07B39] hover:underline"
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
      <div className="mt-8 p-4 bg-[#FDF8F3] rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-sm text-[#6B5344]">Share this link with your recipient:</p>
            <p className="font-mono text-[#2C1810]">
              /j/{journey.unique_slug}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#6B5344]">PIN Code:</p>
            <p className="font-mono text-[#2C1810]">
              {journey.access_code || "No PIN set"}
            </p>
          </div>
        </div>
        <CopyLinkButton uniqueSlug={journey.unique_slug ?? ""} />
      </div>
    </div>
  );
}
