"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Lock, Heart } from "lucide-react";

export default function PinEntryPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [journeyName, setJourneyName] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [journeyError, setJourneyError] = useState<string | null>(null);

  // Check if already authenticated or if user is curator
  useEffect(() => {
    const checkAuth = async () => {
      // Check session storage first
      const authenticated = sessionStorage.getItem(`journey-${slug}-authenticated`);
      if (authenticated === "true") {
        router.replace(`/j/${slug}/intro`);
        return;
      }

      // Try curator preview (auto-bypass for journey owner)
      try {
        const res = await fetch(`/api/journey/${slug}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ curatorPreview: true }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.curatorAccess) {
            sessionStorage.setItem(`journey-${slug}-authenticated`, "true");
            router.replace(`/j/${slug}/intro`);
          }
        }
      } catch (error) {
        console.error("[AUTH] Authentication check failed:", error);
        setAuthError("Failed to verify authentication. Please refresh the page.");
      }
    };

    checkAuth();
  }, [slug, router]);

  // Fetch journey info
  useEffect(() => {
    async function fetchJourney() {
      try {
        const res = await fetch(`/api/journey/${slug}/info`);
        if (res.ok) {
          const data = await res.json();
          setJourneyName(data.name);
          setRecipientName(data.recipient_name);
        } else {
          setJourneyError("Journey not found. Please check your link.");
        }
      } catch (error) {
        console.error("[JOURNEY] Failed to fetch journey:", error);
        setJourneyError("Failed to load journey information. Please refresh the page.");
      }
    }
    fetchJourney();
  }, [slug]);

  const handleKeyPress = (digit: string) => {
    if (activeIndex >= 4) return;

    const newPin = [...pin];
    newPin[activeIndex] = digit;
    setPin(newPin);
    setError(false);

    if (activeIndex < 3) {
      setActiveIndex(activeIndex + 1);
    } else {
      // All digits entered, verify
      verifyPin(newPin.join(""));
    }
  };

  const handleBackspace = () => {
    if (activeIndex > 0) {
      const newPin = [...pin];
      newPin[activeIndex - 1] = "";
      setPin(newPin);
      setActiveIndex(activeIndex - 1);
      setError(false);
    }
  };

  const verifyPin = async (pinCode: string) => {
    setIsUnlocking(true);
    try {
      const res = await fetch(`/api/journey/${slug}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCode }),
      });

      if (res.ok) {
        // Store authentication in session
        sessionStorage.setItem(`journey-${slug}-authenticated`, "true");
        // Delay for unlock animation
        setTimeout(() => {
          router.push(`/j/${slug}/intro`);
        }, 1000);
      } else {
        setError(true);
        setPin(["", "", "", ""]);
        setActiveIndex(0);
        setIsUnlocking(false);
      }
    } catch (error) {
      console.error("[PIN] Verification failed:", error);
      setError(true);
      setPin(["", "", "", ""]);
      setActiveIndex(0);
      setIsUnlocking(false);
      setAuthError("Connection error. Please check your internet and try again.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-[#FDF8F3] to-[#FAF0E6]">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 text-6xl opacity-10 rotate-12">
          <Heart />
        </div>
        <div className="absolute bottom-20 left-10 text-4xl opacity-10 -rotate-12">
          <Heart />
        </div>
      </div>

      <motion.div
        className="relative z-10 text-center max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Lock icon */}
        <motion.div
          className="relative w-24 h-24 mx-auto mb-8"
          animate={isUnlocking ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#C9A227]/20 to-[#E07B39]/20 rounded-full blur-xl" />
          <div className="relative w-full h-full bg-gradient-to-br from-[#C9A227] to-[#E07B39] rounded-full flex items-center justify-center shadow-lg">
            <AnimatePresence mode="wait">
              {isUnlocking ? (
                <motion.div
                  key="unlocking"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <KeyRound className="w-10 h-10 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Lock className="w-10 h-10 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="font-serif text-3xl text-[#2C1810] mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {recipientName ? `Welcome, ${recipientName}` : "Welcome"}
        </motion.h1>
        <motion.p
          className="text-[#6B5344] mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Enter the secret code to begin your adventure
        </motion.p>

        {/* PIN dots */}
        <motion.div
          className="flex justify-center gap-4 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {pin.map((digit, idx) => (
            <motion.div
              key={idx}
              className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                error
                  ? "border-red-400 bg-red-50"
                  : digit
                  ? "border-[#C9A227] bg-[#C9A227]/10 text-[#C9A227]"
                  : idx === activeIndex
                  ? "border-[#C9A227] bg-white"
                  : "border-[#E5DDD5] bg-white"
              }`}
              animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              {digit && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  {digit}
                </motion.span>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Error messages */}
        <AnimatePresence>
          {error && (
            <motion.p
              className="text-red-500 text-sm mb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              Incorrect code. Please try again.
            </motion.p>
          )}
          {authError && (
            <motion.p
              className="text-red-500 text-sm mb-4 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {authError}
            </motion.p>
          )}
          {journeyError && (
            <motion.p
              className="text-red-500 text-sm mb-4 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {journeyError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <motion.div
          className="grid grid-cols-3 gap-3 max-w-xs mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "back"].map((key, idx) => {
            if (key === null) {
              return <div key={idx} className="w-16 h-16" />;
            }
            if (key === "back") {
              return (
                <button
                  key={idx}
                  onClick={handleBackspace}
                  className="w-16 h-16 rounded-full bg-[#E5DDD5]/50 flex items-center justify-center text-[#6B5344] hover:bg-[#E5DDD5] transition-colors mx-auto"
                  disabled={isUnlocking}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                    />
                  </svg>
                </button>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => handleKeyPress(String(key))}
                className="w-16 h-16 rounded-full bg-white shadow-sm border border-[#E5DDD5] flex items-center justify-center text-2xl font-medium text-[#2C1810] hover:bg-[#FAF0E6] hover:border-[#C9A227] transition-all active:scale-95 mx-auto"
                disabled={isUnlocking}
              >
                {key}
              </button>
            );
          })}
        </motion.div>

        {/* Journey name */}
        {journeyName && (
          <motion.p
            className="mt-8 text-sm text-[#6B5344]/60 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {journeyName}
          </motion.p>
        )}
      </motion.div>
    </main>
  );
}
