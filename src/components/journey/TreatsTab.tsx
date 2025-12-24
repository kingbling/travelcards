"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Lock, Clock } from "lucide-react";
import type { Treat } from "@/types/database";

interface TreatQuota {
  canReveal: boolean;
  remaining: number;
  perWeek: number;
  available: number;
  unlocked: boolean;
  nextResetTime: string;
  daysUntilReset: number;
}

interface TreatsData {
  treats: Treat[];
  quota: TreatQuota;
}

interface TreatsTabProps {
  journeySlug: string;
}

export function TreatsTab({ journeySlug }: TreatsTabProps) {
  const [data, setData] = useState<TreatsData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const { treats, quota } = data;

  // Show locked state if no cards revealed yet
  if (!quota.unlocked) {
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
  if (treats.length === 0 && quota.available === 0) {
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
        {quota.canReveal ? (
          <p className="text-sm text-[#6B5344] font-medium">
            {quota.remaining} treat{quota.remaining === 1 ? "" : "s"} available to reveal
          </p>
        ) : quota.remaining === 0 ? (
          <>
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-600" />
            <p className="text-sm text-[#6B5344] font-medium">
              Weekly treats revealed
            </p>
            <p className="text-xs text-[#6B5344] mt-1">
              Next reset in {quota.daysUntilReset} day{quota.daysUntilReset === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <p className="text-sm text-[#6B5344] font-medium">
            All treats revealed!
          </p>
        )}
        <p className="text-xs text-[#6B5344] mt-2 opacity-75">
          Reveal treats from any destination page
        </p>
      </motion.div>

      {/* Unrevealed treats count */}
      {quota.available > 0 && (
        <motion.div
          className="text-center p-6 rounded-xl bg-gradient-to-br from-[#E07B39]/10 to-[#C9A227]/10 border border-[#E5DDD5]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Gift className="w-10 h-10 mx-auto mb-3 text-[#E07B39]" />
          <p className="text-lg font-serif text-[#2C1810]">
            {quota.available} mystery treat{quota.available === 1 ? "" : "s"} await
          </p>
          <p className="text-xs text-[#6B5344] mt-2">
            Visit a destination to reveal treats
          </p>
        </motion.div>
      )}

      {/* Revealed treats */}
      {treats.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl text-[#2C1810] mb-4">
            Your Treats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {treats.map((treat, idx) => (
              <motion.div
                key={treat.id}
                className="p-4 rounded-xl bg-white border border-[#E5DDD5] hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <p className="text-2xl mb-2">🎁</p>
                <p className="text-sm font-serif text-[#2C1810] line-clamp-2">
                  {treat.name}
                </p>
                {treat.description && (
                  <p className="text-xs text-[#6B5344] mt-1 line-clamp-2">
                    {treat.description}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
