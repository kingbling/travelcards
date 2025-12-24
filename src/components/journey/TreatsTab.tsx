"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Lock, Clock } from "lucide-react";
import type { Treat } from "@/types/database";
import type { TreatQuotaInfo } from "@/lib/api/treat-quota";
import { TreatReveal } from "@/components/TreatReveal";

interface TreatsData {
  treats: Treat[];
  quotaInfo: TreatQuotaInfo;
}

interface TreatsTabProps {
  journeySlug: string;
}

export function TreatsTab({ journeySlug }: TreatsTabProps) {
  const [data, setData] = useState<TreatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealingTreat, setRevealingTreat] = useState<Treat | null>(null);

  // Fetch treats data
  useEffect(() => {
    async function fetchTreats() {
      try {
        const res = await fetch(`/api/journey/${journeySlug}/treats`);
        if (res.ok) {
          const treatsData = await res.json();
          setData(treatsData);
        }
      } catch (error) {
        console.error("Failed to fetch treats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTreats();
  }, [journeySlug]);

  const handleRevealComplete = () => {
    setRevealingTreat(null);
    // Refresh treats data
    fetch(`/api/journey/${journeySlug}/treats`)
      .then((res) => res.json())
      .then((treatsData) => setData(treatsData));
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto text-center p-8">
        <p className="text-[#6B5344]">Loading treats...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto text-center p-8">
        <p className="text-[#6B5344]">Failed to load treats</p>
      </div>
    );
  }

  const { treats, quotaInfo } = data;
  const availableTreats = treats.filter(
    (t) => !t.is_revealed && quotaInfo.hasQuota && quotaInfo.anyCardRevealed
  );
  const revealedTreats = treats.filter((t) => t.is_revealed);

  // Show locked state if no cards revealed yet
  if (!quotaInfo.anyCardRevealed) {
    return (
      <div className="max-w-md mx-auto">
        <motion.div
          className="text-center p-8 rounded-xl border-2 border-[#E5DDD5] bg-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Lock className="w-12 h-12 mx-auto mb-4 text-[#6B5344]" />
          <h3 className="font-serif text-xl text-[#2C1810] mb-2">
            Treats Locked
          </h3>
          <p className="text-sm text-[#6B5344]">
            Reveal your first experience card to unlock treats!
          </p>
        </motion.div>
      </div>
    );
  }

  // Show empty state if no treats exist
  if (treats.length === 0) {
    return (
      <div className="max-w-md mx-auto">
        <motion.div
          className="text-center p-8 rounded-xl border-2 border-[#E5DDD5] bg-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Gift className="w-12 h-12 mx-auto mb-4 text-[#E07B39]" />
          <h3 className="font-serif text-xl text-[#2C1810] mb-2">
            No Treats Yet
          </h3>
          <p className="text-sm text-[#6B5344]">
            Your curator hasn't added any treats to your journey yet.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8">
      {/* Quota info */}
      <motion.div
        className="text-center p-4 rounded-xl bg-gradient-to-r from-[#FDF8F3] to-[#FAF0E6] border border-[#E5DDD5]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm text-[#6B5344] font-medium">
          {quotaInfo.remainingTreats} treat
          {quotaInfo.remainingTreats === 1 ? "" : "s"} remaining this week
        </p>
        {quotaInfo.treatsRevealed > 0 && (
          <p className="text-xs text-[#6B5344] mt-1">
            {quotaInfo.treatsRevealed} of {quotaInfo.treatsPerWeek} revealed
          </p>
        )}
      </motion.div>

      {/* Available treats */}
      {availableTreats.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl text-[#2C1810] mb-4">
            Ready to Reveal
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {availableTreats.map((treat, idx) => (
              <motion.button
                key={treat.id}
                onClick={() => setRevealingTreat(treat)}
                className="p-6 rounded-xl bg-gradient-to-br from-[#E07B39]/10 to-[#C9A227]/10 hover:from-[#E07B39]/20 hover:to-[#C9A227]/20 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Gift className="w-8 h-8 mx-auto mb-2 text-[#E07B39]" />
                <p className="text-sm text-[#2C1810] font-medium">Mystery Treat</p>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Quota exhausted message */}
      {!quotaInfo.hasQuota && availableTreats.length === 0 && revealedTreats.length > 0 && (
        <motion.div
          className="text-center p-6 rounded-xl bg-gradient-to-br from-[#FDF8F3] to-[#FAF0E6] border border-[#E5DDD5]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Clock className="w-12 h-12 mx-auto mb-3 text-amber-600" />
          <h3 className="font-serif text-lg text-[#2C1810] mb-2">
            Weekly Treats Revealed
          </h3>
          <p className="text-sm text-[#6B5344]">
            You've revealed {quotaInfo.treatsRevealed} of{" "}
            {quotaInfo.treatsPerWeek} treats this week.
            <br />
            New treats unlock each week!
          </p>
        </motion.div>
      )}

      {/* Revealed treats */}
      {revealedTreats.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl text-[#2C1810] mb-4">
            Your Treats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {revealedTreats.map((treat, idx) => (
              <motion.div
                key={treat.id}
                className="p-4 rounded-xl bg-white border border-[#E5DDD5] hover:shadow-md transition-shadow cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  // Could open a modal with full details
                }}
              >
                <p className="text-2xl mb-2">🎁</p>
                <p className="text-sm font-serif text-[#2C1810] line-clamp-2">
                  {treat.name}
                </p>
                {treat.estimated_cost && (
                  <p className="text-xs text-[#6B5344] mt-1">{treat.estimated_cost}</p>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Reveal modal */}
      {revealingTreat && (
        <TreatReveal
          treat={revealingTreat}
          journeySlug={journeySlug}
          onComplete={handleRevealComplete}
        />
      )}
    </div>
  );
}
