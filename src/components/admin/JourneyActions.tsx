"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, X, ExternalLink, Loader2 } from "lucide-react";

interface JourneyActionsProps {
  journeyId: string;
  isPublished: boolean;
  uniqueSlug: string;
}

export function PublishButton({ journeyId, isPublished }: { journeyId: string; isPublished: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const togglePublish = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from("journeys")
        .update({
          is_published: !isPublished,
          published_at: !isPublished ? new Date().toISOString() : null,
        })
        .eq("id", journeyId);

      router.refresh();
    } catch (error) {
      console.error("Failed to update publish status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={togglePublish}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
        isPublished
          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
          : "bg-emerald-500 text-white hover:bg-emerald-600"
      } transition-colors disabled:opacity-50`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPublished ? (
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
  );
}

export function CopyLinkButton({ uniqueSlug }: { uniqueSlug: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = `${window.location.origin}/j/${uniqueSlug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copyLink}
      className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium text-[#6B5344] hover:bg-[#E5DDD5] transition-colors"
    >
      <ExternalLink className="w-4 h-4" />
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}

export function JourneyShareLink({ uniqueSlug }: { uniqueSlug: string }) {
  return (
    <p className="font-mono text-[#2C1810]">
      {typeof window !== "undefined" ? window.location.origin : ""}/j/{uniqueSlug}
    </p>
  );
}
