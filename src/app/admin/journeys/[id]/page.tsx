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
  ExternalLink,
  Check,
  X,
} from "lucide-react";
import type { Card, Participant, Destination, Chapter, LoveLetter } from "@/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

interface JourneyWithRelations {
  id: string;
  name: string;
  recipient_name: string | null;
  unique_slug: string | null;
  is_published: boolean;
  participants: Participant[] | null;
  destinations: (Destination & { chapters: Chapter[] | null })[] | null;
  cards: Card[] | null;
  love_letters: LoveLetter[] | null;
}

export default async function JourneyManagePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch journey with all related data
  const { data, error } = await supabase
    .from("journeys")
    .select(`
      *,
      participants(*),
      destinations(
        *,
        chapters(*)
      ),
      cards(*),
      love_letters(*)
    `)
    .eq("id", id)
    .eq("curator_id", user.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const journey = data as unknown as JourneyWithRelations;

  // Count cards by status
  const cardStats = {
    total: journey.cards?.length ?? 0,
    draft: journey.cards?.filter((c) => c.status === "draft").length ?? 0,
    approved: journey.cards?.filter((c) => c.status === "approved").length ?? 0,
    revealed: journey.cards?.filter((c) => c.is_revealed).length ?? 0,
  };

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
          <button
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              journey.is_published
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            } transition-colors`}
          >
            {journey.is_published ? (
              <>
                <X className="w-4 h-4" />
                Unpublish
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Publish
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E07B39]/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#E07B39]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2C1810]">{journey.destinations?.length ?? 0}</p>
              <p className="text-sm text-[#6B5344]">Destinations</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C9A227]/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#C9A227]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2C1810]">{cardStats.total}</p>
              <p className="text-sm text-[#6B5344]">Total Cards</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2C1810]">{cardStats.approved}</p>
              <p className="text-sm text-[#6B5344]">Approved</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2C1810]">{journey.participants?.length ?? 0}</p>
              <p className="text-sm text-[#6B5344]">Travelers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Generate Cards */}
        <Link
          href={`/admin/journeys/${id}/generate`}
          className="bg-gradient-to-br from-[#E07B39] to-[#C9A227] rounded-2xl p-6 text-white hover:shadow-lg transition-shadow"
        >
          <Sparkles className="w-8 h-8 mb-4" />
          <h3 className="font-serif text-xl mb-2">Generate Cards</h3>
          <p className="text-white/80 text-sm">
            Use AI to create experience cards
          </p>
        </Link>

        {/* Manage Cards */}
        <Link
          href={`/admin/journeys/${id}/cards`}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-[#E5DDD5]"
        >
          <div className="w-8 h-8 mb-4 rounded-full bg-[#C9A227]/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#C9A227]" />
          </div>
          <h3 className="font-serif text-xl text-[#2C1810] mb-2">Manage Cards</h3>
          <p className="text-[#6B5344] text-sm">
            Review and approve cards
          </p>
          <p className="text-sm mt-2">
            <span className="text-amber-600">{cardStats.draft} drafts</span>
            {" • "}
            <span className="text-emerald-600">{cardStats.approved} approved</span>
          </p>
        </Link>

        {/* Reveal Schedule */}
        <Link
          href={`/admin/journeys/${id}/schedule`}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-[#E5DDD5]"
        >
          <div className="w-8 h-8 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="font-serif text-xl text-[#2C1810] mb-2">Schedule</h3>
          <p className="text-[#6B5344] text-sm">
            Plan when cards are revealed
          </p>
          <p className="text-sm mt-2 text-[#6B5344]">
            Set dates and frequency
          </p>
        </Link>

        {/* Love Letters */}
        <Link
          href={`/admin/journeys/${id}/letters`}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-[#E5DDD5]"
        >
          <div className="w-8 h-8 mb-4 rounded-full bg-pink-500/10 flex items-center justify-center">
            <span className="text-lg">💌</span>
          </div>
          <h3 className="font-serif text-xl text-[#2C1810] mb-2">Love Letters</h3>
          <p className="text-[#6B5344] text-sm">
            Write personal messages
          </p>
          <p className="text-sm mt-2 text-[#6B5344]">
            {journey.love_letters?.length ?? 0} letters written
          </p>
        </Link>
      </div>

      {/* Destinations */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-[#E5DDD5] flex items-center justify-between">
          <h2 className="font-serif text-xl text-[#2C1810]">Destinations</h2>
          <button className="text-sm text-[#E07B39] hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Add Destination
          </button>
        </div>

        {journey.destinations && journey.destinations.length > 0 ? (
          <div className="divide-y divide-[#E5DDD5]">
            {journey.destinations.map((dest) => (
              <div key={dest.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-[#E07B39]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#2C1810]">{dest.name}</h3>
                    <p className="text-sm text-[#6B5344]">{dest.country}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {dest.start_date && (
                    <div className="flex items-center gap-2 text-sm text-[#6B5344]">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(dest.start_date).toLocaleDateString()} -{" "}
                        {dest.end_date ? new Date(dest.end_date).toLocaleDateString() : "..."}
                      </span>
                    </div>
                  )}
                  <div className="text-sm text-[#6B5344]">
                    {dest.chapters?.length ?? 0} chapters
                  </div>
                  <button className="text-sm text-[#E07B39] hover:underline">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-[#6B5344]">
            No destinations added yet.{" "}
            <button className="text-[#E07B39] hover:underline">
              Add your first destination
            </button>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E5DDD5] flex items-center justify-between">
          <h2 className="font-serif text-xl text-[#2C1810]">Travelers</h2>
          <button className="text-sm text-[#E07B39] hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Add Traveler
          </button>
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
                        <span className="px-2 py-0.5 text-xs bg-pink-100 text-pink-600 rounded-full">
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
                  <button className="text-sm text-[#E07B39] hover:underline">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-[#6B5344]">
            No travelers added yet.{" "}
            <button className="text-[#E07B39] hover:underline">
              Add travelers
            </button>
          </div>
        )}
      </div>

      {/* Journey Link */}
      <div className="mt-8 p-4 bg-[#FDF8F3] rounded-xl flex items-center justify-between">
        <div>
          <p className="text-sm text-[#6B5344]">Share this link with your recipient:</p>
          <p className="font-mono text-[#2C1810]">
            {typeof window !== "undefined" ? window.location.origin : ""}/j/{journey.unique_slug}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium text-[#6B5344] hover:bg-[#E5DDD5] transition-colors">
          <ExternalLink className="w-4 h-4" />
          Copy Link
        </button>
      </div>
    </div>
  );
}
