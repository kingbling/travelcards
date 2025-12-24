"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Heart,
  MapPin,
  Users,
  Lock,
  Car,
  Home,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { CountrySelect, CityAutocomplete } from "@/components/admin/Autocomplete";

type Step = 1 | 2 | 3;

interface Participant {
  id?: string;
  name: string;
  age: string;
  role: string;
  interests: string;
  isRecipient: boolean;
}

interface Waypoint {
  id?: string;
  name: string;
  description: string;
  dayNumber: string;
}

interface Destination {
  id?: string;
  type: "stay" | "roadtrip";
  name: string;
  country: string;
  startLocation: string;
  endLocation: string;
  transportMode: string;
  waypoints: Waypoint[];
  startDate: string;
  endDate: string;
  revealsPerWeek: string;  // "" means use journey default
  treatsPerWeek: string;   // "" means use journey default
}

interface JourneyData {
  id: string;
  name: string;
  recipient_name: string | null;
  recipient_email: string | null;
  unique_slug: string | null;
  access_code: string | null;
}

export default function EditJourneyPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const journeyId = params.id as string;
  const urlStep = searchParams.get("step");
  const supabase = createClient();

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [step, setStep] = useState<Step>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Info
  const [journeyName, setJourneyName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [accessCode, setAccessCode] = useState("");

  // Step 2: Participants
  const [participants, setParticipants] = useState<Participant[]>([
    { name: "", age: "", role: "", interests: "", isRecipient: true },
  ]);

  // Step 3: Destinations
  const [destinations, setDestinations] = useState<Destination[]>([
    {
      type: "stay",
      name: "",
      country: "",
      startLocation: "",
      endLocation: "",
      transportMode: "car",
      waypoints: [],
      startDate: "",
      endDate: "",
      revealsPerWeek: "",
      treatsPerWeek: ""
    },
  ]);

  // Load existing journey data
  useEffect(() => {
    const loadJourneyData = async () => {
      setIsLoadingData(true);

      try {
        // Load journey
        const { data: journey, error: journeyError } = await supabase
          .from("journeys")
          .select("*")
          .eq("id", journeyId)
          .single();

        if (journeyError || !journey) {
          setError("Journey not found");
          return;
        }

        const j = journey as JourneyData;
        setJourneyName(j.name || "");
        setRecipientName(j.recipient_name || "");
        setRecipientEmail(j.recipient_email || "");
        setSlug(j.unique_slug || "");
        setAccessCode(j.access_code || "");

        // Load participants
        const { data: participantsData } = await supabase
          .from("participants")
          .select("*")
          .eq("journey_id", journeyId)
          .order("order_index");

        if (participantsData && participantsData.length > 0) {
          setParticipants(
            participantsData.map((p) => ({
              id: p.id,
              name: p.name || "",
              age: p.age?.toString() || "",
              role: p.role || "",
              interests: Array.isArray(p.interests) ? p.interests.join(", ") : "",
              isRecipient: p.is_recipient || false,
            }))
          );
        }

        // Load destinations with waypoints
        const { data: destinationsData } = await supabase
          .from("destinations")
          .select(`
            *,
            waypoints(*)
          `)
          .eq("journey_id", journeyId)
          .order("order_index");

        if (destinationsData && destinationsData.length > 0) {
          setDestinations(
            destinationsData.map((d) => {
              // Cast to include quota fields that may be present
              const dest = d as typeof d & { reveals_per_week?: number | null; treats_per_week?: number | null };
              return {
                id: dest.id,
                type: (dest.destination_type as "stay" | "roadtrip") || "stay",
                name: dest.name || "",
                country: dest.country || "",
                startLocation: dest.start_location || "",
                endLocation: dest.end_location || "",
                transportMode: dest.transport_mode || "car",
                waypoints: (dest.waypoints || []).map((wp: { id: string; name: string | null; description: string | null; day_number: number | null }) => ({
                  id: wp.id,
                  name: wp.name || "",
                  description: wp.description || "",
                  dayNumber: wp.day_number?.toString() || "",
                })),
                startDate: dest.start_date || "",
                endDate: dest.end_date || "",
                revealsPerWeek: dest.reveals_per_week?.toString() || "",
                treatsPerWeek: dest.treats_per_week?.toString() || "",
              };
            })
          );
        }

        // Set step: URL param takes priority, otherwise auto-detect based on data
        if (urlStep && ["1", "2", "3"].includes(urlStep)) {
          setStep(parseInt(urlStep) as Step);
        } else if (destinationsData && destinationsData.length > 0) {
          // If destinations exist, start at step 3 (they can still edit)
          setStep(3);
        } else if (participantsData && participantsData.length > 0) {
          // If only participants exist, start at step 2
          setStep(2);
        }
        // Otherwise start at step 1
      } catch {
        setError("Failed to load journey data");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadJourneyData();
  }, [journeyId, supabase, urlStep]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleRecipientNameChange = (value: string) => {
    setRecipientName(value);
    if (!slug || slug === generateSlug(recipientName + "-adventure")) {
      setSlug(generateSlug(value + "-adventure"));
    }
  };

  const addParticipant = () => {
    setParticipants([
      ...participants,
      { name: "", age: "", role: "", interests: "", isRecipient: false },
    ]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string | boolean) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const addDestination = () => {
    setDestinations([
      ...destinations,
      {
        type: "stay",
        name: "",
        country: "",
        startLocation: "",
        endLocation: "",
        transportMode: "car",
        waypoints: [],
        startDate: "",
        endDate: "",
        revealsPerWeek: "",
        treatsPerWeek: "",
      },
    ]);
  };

  const removeDestination = (index: number) => {
    if (destinations.length > 1) {
      setDestinations(destinations.filter((_, i) => i !== index));
    }
  };

  const updateDestination = (index: number, field: keyof Destination, value: string | Waypoint[]) => {
    const updated = [...destinations];
    updated[index] = { ...updated[index], [field]: value };
    setDestinations(updated);
  };

  const addWaypoint = (destIndex: number) => {
    const updated = [...destinations];
    updated[destIndex].waypoints.push({ name: "", description: "", dayNumber: "" });
    setDestinations(updated);
  };

  const removeWaypoint = (destIndex: number, wpIndex: number) => {
    const updated = [...destinations];
    updated[destIndex].waypoints = updated[destIndex].waypoints.filter((_, i) => i !== wpIndex);
    setDestinations(updated);
  };

  const updateWaypoint = (destIndex: number, wpIndex: number, field: keyof Waypoint, value: string) => {
    const updated = [...destinations];
    updated[destIndex].waypoints[wpIndex] = { ...updated[destIndex].waypoints[wpIndex], [field]: value };
    setDestinations(updated);
  };

  // Step 1: Update journey basic info
  const handleStep1Complete = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("journeys")
        .update({
          name: journeyName,
          recipient_name: recipientName,
          recipient_email: recipientEmail || null,
          unique_slug: slug,
          access_code: accessCode || null,
        })
        .eq("id", journeyId);

      if (updateError) throw updateError;

      setStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save journey";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Step 2: Save participants
  const handleStep2Complete = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Delete existing participants
      await supabase
        .from("participants")
        .delete()
        .eq("journey_id", journeyId);

      // Insert new participants
      const participantData = participants
        .filter((p) => p.name.trim())
        .map((p, index) => ({
          journey_id: journeyId,
          name: p.name,
          age: p.age ? parseInt(p.age) : null,
          role: p.role || null,
          interests: p.interests ? p.interests.split(",").map((i) => i.trim()) : [],
          is_recipient: p.isRecipient,
          order_index: index,
        }));

      if (participantData.length > 0) {
        const { error: participantError } = await supabase
          .from("participants")
          .insert(participantData);

        if (participantError) throw participantError;
      }

      setStep(3);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save travelers";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Step 3: Save destinations and complete
  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Delete existing destinations and waypoints
      const { data: existingDests } = await supabase
        .from("destinations")
        .select("id")
        .eq("journey_id", journeyId);

      if (existingDests && existingDests.length > 0) {
        for (const dest of existingDests) {
          await supabase
            .from("waypoints")
            .delete()
            .eq("destination_id", dest.id);
        }
        await supabase
          .from("destinations")
          .delete()
          .eq("journey_id", journeyId);
      }

      // Create destinations
      const validDestinations = destinations.filter((d) =>
        d.type === "stay" ? d.name.trim() : d.startLocation.trim() && d.endLocation.trim()
      );

      for (let i = 0; i < validDestinations.length; i++) {
        const d = validDestinations[i];
        const destData = {
          journey_id: journeyId,
          destination_type: d.type,
          name: d.type === "stay" ? d.name : `${d.startLocation} → ${d.endLocation}`,
          country: d.country || null,
          start_location: d.type === "roadtrip" ? d.startLocation : null,
          end_location: d.type === "roadtrip" ? d.endLocation : null,
          transport_mode: d.type === "roadtrip" ? d.transportMode : null,
          start_date: d.startDate || null,
          end_date: d.endDate || null,
          order_index: i,
          reveals_per_week: d.revealsPerWeek ? parseInt(d.revealsPerWeek) : null,
          treats_per_week: d.treatsPerWeek ? parseInt(d.treatsPerWeek) : null,
        };

        const { data: dest, error: destError } = await supabase
          .from("destinations")
          .insert(destData)
          .select()
          .single();

        if (destError) throw destError;

        // Create waypoints for road trips
        if (d.type === "roadtrip" && d.waypoints.length > 0 && dest) {
          const waypointData = d.waypoints
            .filter((wp) => wp.name.trim())
            .map((wp, wpIndex) => ({
              destination_id: dest.id,
              name: wp.name,
              description: wp.description || null,
              day_number: wp.dayNumber ? parseInt(wp.dayNumber) : null,
              order_index: wpIndex,
            }));

          if (waypointData.length > 0) {
            const { error: wpError } = await supabase
              .from("waypoints")
              .insert(waypointData);

            if (wpError) throw wpError;
          }
        }
      }

      // Redirect to journey management
      router.push(`/admin/journeys/${journeyId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save destinations";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return journeyName.trim() && recipientName.trim() && slug.trim();
      case 2:
        return participants.some((p) => p.name.trim());
      case 3:
        return destinations.some((d) =>
          d.type === "stay"
            ? d.name.trim()
            : d.startLocation.trim() && d.endLocation.trim()
        );
      default:
        return false;
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A227] mx-auto mb-4" />
          <p className="text-[#6B5344]">Loading journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl text-[#2C1810] mb-2">Continue Journey Setup</h1>
        <p className="text-[#6B5344]">Complete your journey configuration</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                s < step
                  ? "bg-[#C9A227] text-white"
                  : s === step
                  ? "bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white"
                  : "bg-[#E5DDD5] text-[#6B5344]"
              }`}
            >
              {s < step ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-0.5 ${
                  s < step ? "bg-[#C9A227]" : "bg-[#E5DDD5]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-between mb-8 px-4">
        <span className={`text-sm ${step >= 1 ? "text-[#2C1810]" : "text-[#6B5344]"}`}>
          Basic Info
        </span>
        <span className={`text-sm ${step >= 2 ? "text-[#2C1810]" : "text-[#6B5344]"}`}>
          Travelers
        </span>
        <span className={`text-sm ${step >= 3 ? "text-[#2C1810]" : "text-[#6B5344]"}`}>
          Destinations
        </span>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-[#E07B39]" />
                </div>
                <h2 className="font-serif text-xl text-[#2C1810]">Journey Details</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-1">
                  Journey Name *
                </label>
                <input
                  type="text"
                  value={journeyName}
                  onChange={(e) => setJourneyName(e.target.value)}
                  placeholder="e.g., Our Adventure 2025"
                  className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => handleRecipientNameChange(e.target.value)}
                  placeholder="Who is this journey for?"
                  className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-1">
                  Recipient Email (optional)
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="For email notifications"
                  className="w-full px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-1">
                  URL Slug *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B5344]">/j/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="unique-slug"
                    className="flex-1 px-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none"
                  />
                </div>
                <p className="text-sm text-[#6B5344] mt-1">
                  This will be the link: /j/{slug || "..."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-1">
                  Access Code (optional)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B5344]" />
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="4-digit PIN"
                    maxLength={4}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none"
                  />
                </div>
                <p className="text-sm text-[#6B5344] mt-1">
                  Require a PIN to access the journey
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Participants */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#E07B39]" />
                </div>
                <h2 className="font-serif text-xl text-[#2C1810]">Who's Traveling?</h2>
              </div>

              {participants.map((participant, index) => (
                <div
                  key={index}
                  className="p-4 bg-[#FDF8F3] rounded-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#2C1810]">
                      Traveler {index + 1}
                    </span>
                    {participants.length > 1 && (
                      <button
                        onClick={() => removeParticipant(index)}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#6B5344] mb-1">Name</label>
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(e) => updateParticipant(index, "name", e.target.value)}
                        placeholder="Name"
                        className="w-full px-3 py-2 rounded-lg border border-[#E5DDD5] focus:border-[#C9A227] outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#6B5344] mb-1">Age</label>
                      <input
                        type="number"
                        value={participant.age}
                        onChange={(e) => updateParticipant(index, "age", e.target.value)}
                        placeholder="Age"
                        className="w-full px-3 py-2 rounded-lg border border-[#E5DDD5] focus:border-[#C9A227] outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-[#6B5344] mb-1">Role</label>
                    <select
                      value={participant.role}
                      onChange={(e) => updateParticipant(index, "role", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5DDD5] focus:border-[#C9A227] outline-none text-sm"
                    >
                      <option value="">Select role...</option>
                      <option value="wife">Wife</option>
                      <option value="husband">Husband</option>
                      <option value="partner">Partner</option>
                      <option value="daughter">Daughter</option>
                      <option value="son">Son</option>
                      <option value="friend">Friend</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[#6B5344] mb-1">Interests</label>
                    <input
                      type="text"
                      value={participant.interests}
                      onChange={(e) => updateParticipant(index, "interests", e.target.value)}
                      placeholder="wine, food, art, animals (comma separated)"
                      className="w-full px-3 py-2 rounded-lg border border-[#E5DDD5] focus:border-[#C9A227] outline-none text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={participant.isRecipient}
                      onChange={(e) => updateParticipant(index, "isRecipient", e.target.checked)}
                      className="w-4 h-4 rounded border-[#E5DDD5] text-[#C9A227] focus:ring-[#C9A227]"
                    />
                    <span className="text-sm text-[#6B5344]">This is the main recipient</span>
                  </label>
                </div>
              ))}

              <button
                onClick={addParticipant}
                className="w-full py-3 border-2 border-dashed border-[#E5DDD5] rounded-xl text-[#6B5344] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors"
              >
                + Add Another Traveler
              </button>
            </motion.div>
          )}

          {/* Step 3: Destinations */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#E07B39]" />
                </div>
                <h2 className="font-serif text-xl text-[#2C1810]">Where Are You Going?</h2>
              </div>

              {destinations.map((destination, index) => (
                <div
                  key={index}
                  className="p-4 bg-[#FDF8F3] rounded-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#2C1810]">
                      Leg {index + 1}
                    </span>
                    {destinations.length > 1 && (
                      <button
                        onClick={() => removeDestination(index)}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Destination Type Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateDestination(index, "type", "stay")}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                        destination.type === "stay"
                          ? "border-[#C9A227] bg-[#C9A227]/10"
                          : "border-[#E5DDD5] hover:border-[#C9A227]/50"
                      }`}
                    >
                      <Home className={`w-5 h-5 ${destination.type === "stay" ? "text-[#C9A227]" : "text-[#6B5344]"}`} />
                      <div className="text-left">
                        <div className={`font-medium text-sm ${destination.type === "stay" ? "text-[#2C1810]" : "text-[#6B5344]"}`}>
                          Stay
                        </div>
                        <div className="text-xs text-[#6B5344]">One location</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDestination(index, "type", "roadtrip")}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                        destination.type === "roadtrip"
                          ? "border-[#C9A227] bg-[#C9A227]/10"
                          : "border-[#E5DDD5] hover:border-[#C9A227]/50"
                      }`}
                    >
                      <Car className={`w-5 h-5 ${destination.type === "roadtrip" ? "text-[#C9A227]" : "text-[#6B5344]"}`} />
                      <div className="text-left">
                        <div className={`font-medium text-sm ${destination.type === "roadtrip" ? "text-[#2C1810]" : "text-[#6B5344]"}`}>
                          Road Trip
                        </div>
                        <div className="text-xs text-[#6B5344]">A to B with stops</div>
                      </div>
                    </button>
                  </div>

                  {/* Stay Type Fields */}
                  {destination.type === "stay" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#6B5344] mb-1">City/Place</label>
                        <CityAutocomplete
                          value={destination.name}
                          onChange={(value) => updateDestination(index, "name", value)}
                          onCountryDetected={(countryName) => {
                            if (!destination.country) {
                              updateDestination(index, "country", countryName);
                            }
                          }}
                          country={destination.country}
                          placeholder="Search city..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B5344] mb-1">Country</label>
                        <CountrySelect
                          value={destination.country}
                          onChange={(value) => updateDestination(index, "country", value)}
                          placeholder="Select country..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Road Trip Type Fields */}
                  {destination.type === "roadtrip" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-[#6B5344] mb-1">From</label>
                          <CityAutocomplete
                            value={destination.startLocation}
                            onChange={(value) => updateDestination(index, "startLocation", value)}
                            placeholder="Starting point"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-[#6B5344] mb-1">To</label>
                          <CityAutocomplete
                            value={destination.endLocation}
                            onChange={(value) => updateDestination(index, "endLocation", value)}
                            placeholder="Destination"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-[#6B5344] mb-1">Transport</label>
                        <select
                          value={destination.transportMode}
                          onChange={(e) => updateDestination(index, "transportMode", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5DDD5] focus:border-[#C9A227] outline-none text-sm"
                        >
                          <option value="car">By Car</option>
                          <option value="train">By Train</option>
                          <option value="bus">By Bus</option>
                          <option value="boat">By Boat</option>
                          <option value="plane">By Plane</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      {/* Waypoints */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-[#2C1810]">Stops Along the Way</label>
                          <button
                            type="button"
                            onClick={() => addWaypoint(index)}
                            className="text-sm text-[#E07B39] hover:text-[#C9A227] flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Add Stop
                          </button>
                        </div>

                        {destination.waypoints.map((wp, wpIndex) => (
                          <div key={wpIndex} className="flex gap-2 items-start bg-white p-3 rounded-lg">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={wp.name}
                                onChange={(e) => updateWaypoint(index, wpIndex, "name", e.target.value)}
                                placeholder="Stop name"
                                className="px-2 py-1.5 rounded border border-[#E5DDD5] text-sm"
                              />
                              <input
                                type="text"
                                value={wp.description}
                                onChange={(e) => updateWaypoint(index, wpIndex, "description", e.target.value)}
                                placeholder="Notes"
                                className="px-2 py-1.5 rounded border border-[#E5DDD5] text-sm"
                              />
                              <input
                                type="number"
                                value={wp.dayNumber}
                                onChange={(e) => updateWaypoint(index, wpIndex, "dayNumber", e.target.value)}
                                placeholder="Day #"
                                className="px-2 py-1.5 rounded border border-[#E5DDD5] text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeWaypoint(index, wpIndex)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {destination.waypoints.length === 0 && (
                          <p className="text-sm text-[#6B5344] italic">No stops added yet</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Common Date Fields */}
                  {(() => {
                    const prevEndDate = index > 0 ? destinations[index - 1].endDate : null;
                    const startDateMin = prevEndDate || undefined;
                    const startDateDisabled = index > 0 && !prevEndDate;

                    return (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E5DDD5]">
                        <div>
                          <label className="block text-sm text-[#6B5344] mb-1">Start Date</label>
                          <input
                            type="date"
                            value={destination.startDate}
                            min={startDateMin}
                            disabled={startDateDisabled}
                            onChange={(e) => {
                              const newStartDate = e.target.value;
                              updateDestination(index, "startDate", newStartDate);
                              // Clear end date if it's now before start date
                              if (destination.endDate && newStartDate > destination.endDate) {
                                updateDestination(index, "endDate", "");
                              }
                            }}
                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm ${
                              startDateDisabled
                                ? "border-[#E5DDD5] bg-gray-50 text-gray-400 cursor-not-allowed"
                                : "border-[#E5DDD5] focus:border-[#C9A227]"
                            }`}
                          />
                          {startDateDisabled && (
                            <p className="text-xs text-[#6B5344] mt-1">Complete previous leg first</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm text-[#6B5344] mb-1">End Date</label>
                          <input
                            type="date"
                            value={destination.endDate}
                            min={destination.startDate || undefined}
                            onChange={(e) => {
                              const newEndDate = e.target.value;
                              updateDestination(index, "endDate", newEndDate);
                              // Clear next leg's start date if it's now before this end date
                              if (index < destinations.length - 1) {
                                const nextStart = destinations[index + 1].startDate;
                                if (nextStart && newEndDate > nextStart) {
                                  updateDestination(index + 1, "startDate", "");
                                  updateDestination(index + 1, "endDate", "");
                                }
                              }
                            }}
                            disabled={!destination.startDate}
                            className={`w-full px-3 py-2 rounded-lg border outline-none text-sm ${
                              !destination.startDate
                                ? "border-[#E5DDD5] bg-gray-50 text-gray-400 cursor-not-allowed"
                                : "border-[#E5DDD5] focus:border-[#C9A227]"
                            }`}
                          />
                          {!destination.startDate && (
                            <p className="text-xs text-[#6B5344] mt-1">Select start date first</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quota Overrides */}
                  <div className="pt-3 border-t border-[#E5DDD5]">
                    <label className="block text-sm font-medium text-[#2C1810] mb-2">
                      Reveal Quotas <span className="font-normal text-[#6B5344]">(optional)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#6B5344] mb-1">Experiences/week</label>
                        <select
                          value={destination.revealsPerWeek}
                          onChange={(e) => updateDestination(index, "revealsPerWeek", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5DDD5] focus:border-[#C9A227] outline-none text-sm"
                        >
                          <option value="">Use journey default</option>
                          <option value="1">1 per week</option>
                          <option value="2">2 per week</option>
                          <option value="3">3 per week</option>
                          <option value="5">5 per week</option>
                          <option value="7">7 per week (daily)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B5344] mb-1">Treats/week</label>
                        <select
                          value={destination.treatsPerWeek}
                          onChange={(e) => updateDestination(index, "treatsPerWeek", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E5DDD5] focus:border-[#C9A227] outline-none text-sm"
                        >
                          <option value="">Use journey default</option>
                          <option value="1">1 per week</option>
                          <option value="2">2 per week</option>
                          <option value="3">3 per week</option>
                          <option value="4">4 per week</option>
                          <option value="5">5 per week</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-[#6B5344] mt-1">
                      Leave empty to use journey-wide settings
                    </p>
                  </div>
                </div>
              ))}

              <button
                onClick={addDestination}
                className="w-full py-3 border-2 border-dashed border-[#E5DDD5] rounded-xl text-[#6B5344] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors"
              >
                + Add Another Leg
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E5DDD5]">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="flex items-center gap-2 px-4 py-2 text-[#6B5344] hover:text-[#2C1810]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <button
              onClick={handleStep1Complete}
              disabled={!canProceed() || isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : step === 2 ? (
            <button
              onClick={handleStep2Complete}
              disabled={!canProceed() || isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finishing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
