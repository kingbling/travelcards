"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift, X } from "lucide-react";
import confetti from "canvas-confetti";

interface Card {
  id: string;
  name: string;
  description: string;
  category: string | null;
  rarity: string | null;
  picture_url: string | null;
  estimated_cost: string | null;
  duration_hours: number | null;
}

interface ExperienceRevealProps {
  card: Card;
  themeColors: { primary: string; secondary: string };
  onComplete: () => void;
  onClose?: () => void;
}

const RARITY_CONFIG: Record<
  string,
  { color: string; bgColor: string; label: string; particles: number }
> = {
  common: { color: "#8B7355", bgColor: "#F5F5F0", label: "Common", particles: 20 },
  uncommon: { color: "#10B981", bgColor: "#ECFDF5", label: "Uncommon", particles: 30 },
  rare: { color: "#3B82F6", bgColor: "#EFF6FF", label: "Rare", particles: 50 },
  legendary: { color: "#F59E0B", bgColor: "#FFFBEB", label: "Legendary", particles: 80 },
};

const CATEGORY_CONFIG: Record<string, { icon: string; label: string }> = {
  food: { icon: "🍽️", label: "Culinary" },
  wine: { icon: "🍷", label: "Wine & Spirits" },
  animals: { icon: "🦁", label: "Wildlife" },
  art: { icon: "🎨", label: "Art & Culture" },
  nature: { icon: "🌿", label: "Nature" },
  culture: { icon: "🏛️", label: "Heritage" },
  adventure: { icon: "⛰️", label: "Adventure" },
  family: { icon: "👨‍👩‍👧‍👦", label: "Family" },
  spa: { icon: "💆", label: "Wellness" },
  music: { icon: "🎵", label: "Music" },
};

// Teaser hints based on category
const TEASER_HINTS: Record<string, string[]> = {
  food: ["A taste awaits...", "Savor the moment...", "Your palate will remember..."],
  wine: ["Uncork a memory...", "A vintage experience...", "Let it breathe..."],
  animals: ["Wild encounters...", "Nature calls...", "Witness the untamed..."],
  art: ["Beauty unveils...", "A masterpiece awaits...", "Culture beckons..."],
  nature: ["Where earth meets soul...", "Breathe it in...", "The wild awaits..."],
  culture: ["Stories echo here...", "Traditions live...", "History whispers..."],
  adventure: ["Your heart will race...", "Push your limits...", "The thrill awaits..."],
  family: ["Memories in the making...", "Together is better...", "Moments to treasure..."],
  spa: ["Rejuvenation awaits...", "Exhale the world...", "Pure serenity..."],
  music: ["Feel the rhythm...", "Let it move you...", "Harmony awaits..."],
};

export function ExperienceReveal({ card, themeColors, onComplete, onClose }: ExperienceRevealProps) {
  const [phase, setPhase] = useState<
    "scratch" | "countdown" | "gift" | "opening" | "rarity" | "emerge" | "celebrate" | "complete"
  >("scratch");
  const [countdown, setCountdown] = useState(3);
  const [shake, setShake] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);

  // Scratch canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasInitializedRef = useRef(false);

  const rarity = card.rarity || "common";
  const rarityConfig = RARITY_CONFIG[rarity];
  const categoryConfig = card.category ? CATEGORY_CONFIG[card.category] : null;

  // Get teaser hint (memoized to prevent re-randomization)
  const teaserHintRef = useRef<string | null>(null);
  if (!teaserHintRef.current) {
    const teaserHints = card.category ? TEASER_HINTS[card.category] || [] : [];
    teaserHintRef.current = teaserHints.length > 0
      ? teaserHints[Math.floor(Math.random() * teaserHints.length)]
      : "Something special awaits...";
  }
  const teaserHint = teaserHintRef.current;

  // Confetti colors based on rarity
  const confettiColorsMap: Record<string, string[]> = {
    common: [themeColors.primary, themeColors.secondary, "#E5DDD5"],
    uncommon: ["#10B981", "#34D399", "#6EE7B7", themeColors.primary],
    rare: ["#3B82F6", "#60A5FA", "#93C5FD", "#8B5CF6"],
    legendary: ["#F59E0B", "#FBBF24", "#FCD34D", "#EF4444", "#EC4899"],
  };
  const confettiColors = confettiColorsMap[rarity] || confettiColorsMap.common;

  // Initialize scratch canvas
  useEffect(() => {
    if (phase !== "scratch" || canvasInitializedRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvasInitializedRef.current = true;

    // Set canvas dimensions based on display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Draw gradient cover
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, themeColors.primary);
    gradient.addColorStop(1, themeColors.secondary);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Add shimmer spots
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * rect.width,
        Math.random() * rect.height,
        Math.random() * 35 + 10,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "#FFD700";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Add text
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillText("Scratch to reveal ✨", rect.width / 2, rect.height / 2);
  }, [phase, themeColors]);

  // Calculate scratch percentage
  const calculateScratchPercent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    // Sample every 4th pixel for performance
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }

    const totalPixels = pixels.length / 16;
    return (transparentPixels / totalPixels) * 100;
  }, []);

  // Scratch at position
  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";

    // Draw circle at point
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    // Draw line from last point for smooth scratching
    if (lastPointRef.current) {
      ctx.lineWidth = 56;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPointRef.current = { x, y };
  }, []);

  // Get position from event
  const getPosition = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e && e.touches.length > 0) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else if ("clientX" in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return null;
  }, []);

  // Handle scratch start
  const handleScratchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;

    const pos = getPosition(e);
    if (pos) {
      lastPointRef.current = pos;
      scratch(pos.x, pos.y);
    }
  }, [getPosition, scratch]);

  // Handle scratch move
  const handleScratchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const pos = getPosition(e);
    if (pos) {
      scratch(pos.x, pos.y);

      // Update progress display (but don't transition yet)
      const percent = calculateScratchPercent();
      setScratchPercent(percent);
    }
  }, [getPosition, scratch, calculateScratchPercent]);

  // Handle when user leaves canvas area (don't transition, just stop drawing)
  const handleScratchLeave = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  // Handle scratch end - just update percentage, don't auto-transition
  const handleScratchEnd = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;

    const percent = calculateScratchPercent();
    setScratchPercent(percent);
  }, [calculateScratchPercent]);

  // Manual reveal button handler
  const handleRevealClick = useCallback(() => {
    if (scratchPercent >= 50) {
      setPhase("countdown");
    }
  }, [scratchPercent]);

  // Phase transitions
  useEffect(() => {
    let timer: NodeJS.Timeout;

    // Countdown phase
    if (phase === "countdown" && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 700);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("reveal:countdown", { detail: { count: countdown } }));
      }
    } else if (phase === "countdown" && countdown === 0) {
      timer = setTimeout(() => setPhase("gift"), 400);
    }

    // Gift phase
    else if (phase === "gift") {
      timer = setTimeout(() => setPhase("opening"), 1000);
      window.dispatchEvent(new CustomEvent("reveal:gift"));
    }

    // Opening phase
    else if (phase === "opening") {
      setShake(true);
      timer = setTimeout(() => {
        setShake(false);
        setPhase("rarity");
      }, 500);
      window.dispatchEvent(new CustomEvent("reveal:opening"));
    }

    // Rarity reveal
    else if (phase === "rarity") {
      timer = setTimeout(() => setPhase("emerge"), 1500);
      window.dispatchEvent(new CustomEvent("reveal:rarity", { detail: { rarity: card.rarity } }));
    }

    // Card emerges
    else if (phase === "emerge") {
      timer = setTimeout(() => setPhase("celebrate"), 1200);
      window.dispatchEvent(new CustomEvent("reveal:emerge"));
    }

    // Celebration - fire confetti!
    else if (phase === "celebrate") {
      // Fire canvas-confetti
      const duration = rarity === "legendary" ? 4000 : rarity === "rare" ? 3000 : 2000;
      const particleCount = rarity === "legendary" ? 150 : rarity === "rare" ? 100 : 60;

      // Initial burst from center
      confetti({
        particleCount,
        spread: 100,
        origin: { y: 0.5, x: 0.5 },
        colors: confettiColors,
        startVelocity: 45,
        gravity: 0.8,
        ticks: 300,
        shapes: ["square", "circle"],
        scalar: 1.2,
      });

      // Side cannons for rare+
      if (rarity === "rare" || rarity === "legendary") {
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 60,
            origin: { x: 0, y: 0.65 },
            colors: confettiColors,
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 60,
            origin: { x: 1, y: 0.65 },
            colors: confettiColors,
          });
        }, 300);
      }

      // Extra bursts for legendary
      if (rarity === "legendary") {
        setTimeout(() => {
          confetti({
            particleCount: 80,
            spread: 120,
            origin: { y: 0.6, x: 0.5 },
            colors: confettiColors,
            startVelocity: 35,
          });
        }, 600);
        setTimeout(() => {
          confetti({
            particleCount: 60,
            spread: 80,
            origin: { y: 0.5, x: 0.3 },
            colors: confettiColors,
          });
          confetti({
            particleCount: 60,
            spread: 80,
            origin: { y: 0.5, x: 0.7 },
            colors: confettiColors,
          });
        }, 900);
      }

      timer = setTimeout(() => {
        setPhase("complete");
        onComplete();
      }, duration);
      window.dispatchEvent(new CustomEvent("reveal:celebrate", { detail: { rarity: card.rarity } }));
    }

    return () => clearTimeout(timer);
  }, [phase, countdown, card.rarity, onComplete, rarity, confettiColors]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Close button - only show after celebration */}
      <AnimatePresence>
        {(phase === "complete" && onClose) && (
          <motion.button
            onClick={onClose}
            className="absolute top-6 right-6 z-[60] w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-[#2C1810] hover:bg-gray-100 transition-colors"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Background gradient glow */}
      <AnimatePresence>
        {(phase === "rarity" || phase === "emerge" || phase === "celebrate" || phase === "complete") && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              initial={{ width: 0, height: 0 }}
              animate={{ width: 600, height: 600 }}
              transition={{ duration: 2, ease: "easeOut" }}
              style={{
                background: `radial-gradient(circle, ${rarityConfig.color}40 0%, ${rarityConfig.color}10 50%, transparent 70%)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCRATCH PHASE */}
      <AnimatePresence>
        {phase === "scratch" && (
          <motion.div
            className="relative flex flex-col items-center px-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Generic teaser text - no category hints */}
            <motion.p
              className="font-serif text-2xl sm:text-3xl text-white mb-6 text-center"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              A new adventure awaits...
            </motion.p>

            {/* Scratch card container */}
            <div className="relative w-[280px] h-[180px] sm:w-[320px] sm:h-[200px] rounded-2xl overflow-hidden shadow-2xl">
              {/* Hidden content behind scratch - keep it mysterious */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary}30, ${themeColors.secondary}30)`,
                }}
              >
                <Sparkles className="w-16 h-16 text-white/80 mb-2" />
                <span className="text-white/80 text-lg font-medium">Mystery awaits!</span>
              </div>

              {/* Scratch canvas overlay */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-pointer rounded-2xl"
                style={{ touchAction: "none" }}
                onMouseDown={handleScratchStart}
                onMouseMove={handleScratchMove}
                onMouseUp={handleScratchEnd}
                onMouseLeave={handleScratchLeave}
                onTouchStart={handleScratchStart}
                onTouchMove={handleScratchMove}
                onTouchEnd={handleScratchEnd}
              />

              {/* Animated hint finger */}
              {scratchPercent < 10 && (
                <motion.div
                  className="absolute top-1/2 left-1/2 pointer-events-none z-20"
                  initial={{ x: -20, y: -20, opacity: 0 }}
                  animate={{
                    x: [-40, 40, -40],
                    y: [-20, 20, -20],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-white/40 blur-md" />
                </motion.div>
              )}
            </div>

            {/* Progress indicator */}
            <motion.div
              className="mt-4 text-white/70 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: scratchPercent > 5 ? 1 : 0 }}
            >
              {Math.round(scratchPercent)}% revealed
            </motion.div>

            {/* Reveal button - shows when they've scratched enough */}
            {scratchPercent >= 50 ? (
              <motion.button
                className="mt-6 px-8 py-3 rounded-full text-white font-semibold text-lg shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`,
                }}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRevealClick}
              >
                Reveal Experience!
              </motion.button>
            ) : (
              <motion.p
                className="mt-6 text-white/50 text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
              >
                Keep scratching...
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* COUNTDOWN PHASE */}
      <AnimatePresence mode="wait">
        {phase === "countdown" && (
          <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                className="text-[120px] sm:text-[150px] font-bold text-white leading-none"
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.34, 1.56, 0.64, 1], // Bouncy ease
                }}
              >
                {countdown}
              </motion.div>
            </AnimatePresence>
            <motion.p
              className="text-white/80 text-xl mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Get ready...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GIFT BOX PHASE */}
      <AnimatePresence>
        {phase === "gift" && (
          <motion.div
            className="relative"
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{
              scale: shake ? [1, 1.05, 0.95, 1.05, 1] : 1,
              rotate: 0,
              opacity: 1,
            }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "backOut" }}
          >
            <motion.div
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary}80, ${themeColors.secondary}80)`,
                boxShadow: `0 0 60px ${themeColors.primary}60`,
              }}
              animate={{
                y: [0, -12, 0],
                rotate: shake ? [-5, 5, -5, 5, 0] : 0,
              }}
              transition={{
                y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
                rotate: shake ? { duration: 0.25 } : {},
              }}
            >
              <Gift className="w-16 h-16 sm:w-20 sm:h-20 text-white" />

              {/* Sparkles around gift */}
              {[...Array(8)].map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const x = Math.cos(angle) * 70;
                const y = Math.sin(angle) * 70;
                return (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.12,
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OPENING BURST */}
      <AnimatePresence>
        {phase === "opening" && (
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[...Array(16)].map((_, i) => {
              const angle = (i / 16) * Math.PI * 2;
              return (
                <motion.div
                  key={i}
                  className="absolute w-4 h-4 rounded-full"
                  style={{ backgroundColor: themeColors.primary }}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: [1, 0],
                    scale: [0, 2],
                    x: Math.cos(angle) * 150,
                    y: Math.sin(angle) * 150,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* RARITY REVEAL */}
      <AnimatePresence>
        {phase === "rarity" && (
          <motion.div
            className="text-center"
            initial={{ scale: 0, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: "backOut" }}
          >
            {categoryConfig && (
              <motion.div
                className="text-7xl sm:text-8xl mb-6"
                animate={{
                  rotate: [0, 8, -8, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "easeInOut",
                }}
              >
                {categoryConfig.icon}
              </motion.div>
            )}
            <motion.div
              className="px-8 py-4 rounded-2xl text-2xl sm:text-3xl font-bold uppercase tracking-wider"
              style={{
                backgroundColor: rarityConfig.bgColor,
                color: rarityConfig.color,
                boxShadow: `0 0 40px ${rarityConfig.color}80`,
              }}
              animate={{
                boxShadow: [
                  `0 0 40px ${rarityConfig.color}80`,
                  `0 0 60px ${rarityConfig.color}`,
                  `0 0 40px ${rarityConfig.color}80`,
                ],
              }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              {rarityConfig.label}
            </motion.div>
            {categoryConfig && (
              <p className="mt-4 text-white text-lg sm:text-xl font-medium">{categoryConfig.label}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD EMERGENCE */}
      <AnimatePresence>
        {(phase === "emerge" || phase === "celebrate" || phase === "complete") && (
          <motion.div
            className="relative max-w-md w-full mx-4"
            initial={{ scale: 0, opacity: 0, y: 100, rotateY: 90 }}
            animate={{
              scale: phase === "emerge" ? [0, 1.1, 1] : 1,
              opacity: 1,
              y: 0,
              rotateY: 0,
            }}
            transition={{
              duration: 1,
              ease: "backOut",
            }}
          >
            {/* Pulsing ring */}
            {phase === "emerge" && (
              <motion.div
                className="absolute inset-0 rounded-3xl -z-10"
                style={{
                  border: `6px solid ${rarityConfig.color}`,
                }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0] }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            )}

            {/* Card */}
            <div
              className="bg-white rounded-3xl overflow-hidden shadow-2xl border-4"
              style={{ borderColor: rarityConfig.color }}
            >
              {/* Image */}
              {card.picture_url ? (
                <div className="relative h-56 sm:h-64 overflow-hidden">
                  <img
                    src={card.picture_url}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold uppercase"
                    style={{
                      backgroundColor: rarityConfig.bgColor,
                      color: rarityConfig.color,
                    }}
                  >
                    {rarityConfig.label}
                  </div>
                </div>
              ) : (
                <div
                  className="h-56 sm:h-64 flex items-center justify-center text-6xl relative"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.primary}20, ${themeColors.secondary}20)`,
                  }}
                >
                  {categoryConfig?.icon || "✨"}
                  <div
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold uppercase"
                    style={{
                      backgroundColor: rarityConfig.bgColor,
                      color: rarityConfig.color,
                    }}
                  >
                    {rarityConfig.label}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-5 sm:p-6">
                <h3 className="font-serif text-xl sm:text-2xl text-[#2C1810] mb-3">{card.name}</h3>
                <p className="text-[#6B5344] mb-4 leading-relaxed text-sm sm:text-base">{card.description}</p>

                {card.category && categoryConfig && (
                  <div className="flex items-center justify-center gap-2 text-base sm:text-lg">
                    <span className="text-2xl sm:text-3xl">{categoryConfig.icon}</span>
                    <span className="font-medium text-[#2C1810]">{categoryConfig.label}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shine effect */}
            {phase === "emerge" && (
              <motion.div
                className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1, ease: "easeInOut" }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
                    width: "40%",
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* RARE/LEGENDARY ANNOUNCEMENT */}
      <AnimatePresence>
        {phase === "celebrate" && (rarity === "rare" || rarity === "legendary") && (
          <motion.div
            className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 pointer-events-none z-50"
            initial={{ scale: 0, opacity: 0, y: 40 }}
            animate={{
              scale: [0, 1.2, 1],
              opacity: [0, 1, 1, 0.8],
              y: [40, 0, 0, -10],
            }}
            transition={{ duration: 2 }}
          >
            <span
              className="font-serif text-4xl sm:text-5xl font-bold px-6 sm:px-10 py-4 sm:py-5 rounded-2xl inline-block whitespace-nowrap"
              style={{
                color: rarityConfig.color,
                textShadow: `0 0 30px ${rarityConfig.color}, 0 0 60px ${rarityConfig.color}`,
                background: `linear-gradient(135deg, ${rarityConfig.bgColor} 0%, rgba(255,255,255,0.95) 100%)`,
              }}
            >
              {rarity === "legendary" ? "⭐ LEGENDARY! ⭐" : "💎 RARE! 💎"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
