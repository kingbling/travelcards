"use client";

import { motion } from "framer-motion";
import {
  ExperienceCard,
  getRarityConfig,
  PROFILE_CONFIG,
  CATEGORY_CONFIG,
} from "@/types";
import { Clock } from "lucide-react";

interface CardProps {
  card: ExperienceCard;
  isFlipped?: boolean;
  onClick?: () => void;
}

export function Card({ card, isFlipped = false, onClick }: CardProps) {
  const rarityConfig = getRarityConfig(card.rarity);
  const profileConfig = PROFILE_CONFIG[card.targetProfile];
  const categoryConfig = CATEGORY_CONFIG[card.category];

  const glowClass = `card-glow-${card.rarity}`;

  return (
    <motion.div
      className={`relative w-[340px] mx-auto cursor-pointer perspective-1000`}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="relative w-full h-[480px] preserve-3d"
        initial={{ rotateY: isFlipped ? 0 : 180 }}
        animate={{ rotateY: isFlipped ? 0 : 180 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Card Front (revealed) */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl overflow-hidden bg-white ${glowClass}`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Header with category and profile */}
          <div className="relative h-32 bg-gradient-to-br from-[#E07B39] to-[#C9A227] p-4">
            <div className="flex justify-between items-start">
              <span className="text-3xl">{categoryConfig.icon}</span>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  color: profileConfig.color,
                }}
              >
                <span>{profileConfig.icon}</span>
                <span>{profileConfig.label}</span>
              </div>
            </div>
            {/* Rarity badge */}
            <div
              className="absolute bottom-3 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
              style={{
                backgroundColor: rarityConfig.bgColor,
                color: rarityConfig.color,
              }}
            >
              {rarityConfig.label}
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3
              className={`font-serif text-xl font-semibold mb-2 ${
                card.rarity === "legendary" ? "text-legendary" : "text-[#2C1810]"
              }`}
            >
              {card.name}
            </h3>
            <p className="text-sm text-[#6B5344] leading-relaxed mb-4 line-clamp-4">
              {card.description}
            </p>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#6B5344]">
                <Clock className="w-4 h-4" />
                <span>{card.durationHours} hours</span>
              </div>
            </div>
          </div>

          {/* Footer gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E07B39] via-[#C9A227] to-[#8B5E3C]" />
        </div>

        {/* Card Back (hidden/unrevealed) */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl overflow-hidden ${glowClass}`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-[#2C1810] to-[#4A5568] flex flex-col items-center justify-center p-6">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10 pattern-overlay" />

            {/* Logo/Icon */}
            <motion.div
              className="text-6xl mb-6"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              ✨
            </motion.div>

            <h4 className="font-serif text-2xl text-white/90 mb-2">
              Experience Awaits
            </h4>
            <p className="text-white/60 text-sm text-center">
              Tap to reveal your adventure
            </p>

            {/* Decorative border */}
            <div className="absolute inset-4 border border-[#C9A227]/30 rounded-xl pointer-events-none" />

            {/* Corner decorations */}
            <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-[#C9A227]/50" />
            <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-[#C9A227]/50" />
            <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-[#C9A227]/50" />
            <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-[#C9A227]/50" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CardBack({ onClick }: { onClick?: () => void }) {
  return (
    <motion.div
      className="relative w-[340px] mx-auto cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-full h-[480px] rounded-2xl overflow-hidden card-glow-legendary">
        <div className="w-full h-full bg-gradient-to-br from-[#2C1810] to-[#4A5568] flex flex-col items-center justify-center p-6 relative">
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10 pattern-overlay" />

          {/* Animated glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C9A227]/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />

          {/* Logo/Icon */}
          <motion.div
            className="text-6xl mb-6 relative z-10"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            ✨
          </motion.div>

          <h4 className="font-serif text-2xl text-white/90 mb-2 relative z-10">
            Experience Awaits
          </h4>
          <p className="text-white/60 text-sm text-center relative z-10">
            Tap to reveal your adventure
          </p>

          {/* Decorative border */}
          <div className="absolute inset-4 border border-[#C9A227]/30 rounded-xl pointer-events-none" />

          {/* Corner decorations */}
          <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-[#C9A227]/50" />
          <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-[#C9A227]/50" />
          <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-[#C9A227]/50" />
          <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-[#C9A227]/50" />
        </div>
      </div>
    </motion.div>
  );
}
