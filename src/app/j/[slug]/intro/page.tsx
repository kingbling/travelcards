"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";
import { useJourneyAuth } from "@/hooks/useJourneyAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function IntroPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [sealBroken, setSealBroken] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letter, setLetter] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const { isAuthenticated, isLoading: authLoading } = useJourneyAuth({ slug });

  // Fetch intro love letter
  useEffect(() => {
    async function fetchLetter() {
      try {
        const res = await fetch(`/api/journey/${slug}/intro`);
        if (res.ok) {
          const data = await res.json();
          setLetter(data);
        }
      } catch {
        // Error fetching letter
      } finally {
        setLoading(false);
      }
    }
    fetchLetter();
  }, [slug]);

  const handleSealClick = () => {
    if (!sealBroken) {
      setSealBroken(true);
      setTimeout(() => setLetterOpen(true), 800);
    }
  };

  const handleContinue = () => {
    router.push(`/j/${slug}/journey`);
  };

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
      <AnimatePresence mode="wait">
        {!letterOpen ? (
          <motion.div
            key="sealed"
            className="relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {/* Envelope */}
            <div className="relative w-72 h-48 bg-gradient-to-br from-[#FAF0E6] to-[#F5E6D3] rounded-lg shadow-xl border border-[#E5DDD5]">
              {/* Envelope flap */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#E5DDD5] to-[#FAF0E6] origin-top rounded-t-lg" />

              {/* Wax seal */}
              <motion.button
                onClick={handleSealClick}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-10"
                whileHover={!sealBroken ? { scale: 1.05 } : {}}
                whileTap={!sealBroken ? { scale: 0.95 } : {}}
                disabled={sealBroken}
              >
                <motion.div
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                    sealBroken
                      ? "bg-gradient-to-br from-[#8B0000] to-[#600000]"
                      : "bg-gradient-to-br from-[#C41E3A] to-[#8B0000]"
                  }`}
                  animate={
                    sealBroken
                      ? {
                          scale: [1, 1.2, 0],
                          rotate: [0, 10, -10, 0],
                          opacity: [1, 1, 0],
                        }
                      : {}
                  }
                  transition={{ duration: 0.6 }}
                >
                  <Heart className="w-6 h-6 text-[#FFD700]" fill="#FFD700" />
                </motion.div>
              </motion.button>

              {/* Tap hint */}
              {!sealBroken && (
                <motion.p
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-[#6B5344] whitespace-nowrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Tap the seal to open
                </motion.p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="letter"
            className="relative w-full max-w-lg"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Letter paper */}
            <div className="bg-[#FDF8F3] rounded-lg shadow-2xl border border-[#E5DDD5] p-8 relative overflow-hidden">
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#C9A227]/10 to-transparent" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-[#C9A227]/10 to-transparent" />

              {/* Title */}
              <motion.h1
                className="font-serif text-3xl text-center text-[#2C1810] mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {letter?.title || "For You"}
              </motion.h1>

              {/* Content */}
              <motion.div
                className="prose prose-lg prose-stone max-w-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="font-serif text-[#2C1810] whitespace-pre-line leading-relaxed">
                  {letter?.content ||
                    "An adventure awaits you...\n\nEach card you reveal is a carefully chosen experience, wrapped with love.\n\nReady to begin?"}
                </div>
              </motion.div>

              {/* Hearts decoration */}
              <motion.div
                className="flex justify-center gap-2 mt-8 text-[#C9A227]"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
              >
                <Heart className="w-4 h-4" fill="currentColor" />
                <Heart className="w-5 h-5" fill="currentColor" />
                <Heart className="w-4 h-4" fill="currentColor" />
              </motion.div>
            </div>

            {/* Continue button */}
            <motion.button
              onClick={handleContinue}
              className="mt-8 w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Begin Your Adventure
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
