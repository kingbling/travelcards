"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, DollarSign, MapPin, Sparkles } from "lucide-react";
import type { CardLocation } from "@/types";
import { CATEGORY_CONFIG, getRarityConfig } from "@/types";

interface MapPopupProps {
  card: CardLocation;
  position: { x: number; y: number };
  onClose: () => void;
  onClick: () => void;
}

export function MapPopup({ card, position, onClose, onClick }: MapPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const rarityConfig = getRarityConfig(card.rarity);
  const categoryConfig = card.category ? CATEGORY_CONFIG[card.category] : null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        className="fixed z-50 bg-white rounded-xl shadow-2xl border-2 border-[#E5DDD5] overflow-hidden max-w-sm"
        style={{
          left: position.x,
          top: position.y - 10,
          transform: "translate(-50%, -100%)",
        }}
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors z-10"
        >
          <X className="w-4 h-4 text-[#6B5344]" />
        </button>

        {/* Image or gradient */}
        <div
          className="h-32 bg-gradient-to-br from-[#E07B39] to-[#C9A227] flex items-center justify-center"
          style={{
            backgroundImage: card.picture_url ? `url(${card.picture_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!card.picture_url && categoryConfig && (
            <span className="text-5xl">{categoryConfig.icon}</span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Rarity badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: rarityConfig.bgColor,
                color: rarityConfig.color,
              }}
            >
              {rarityConfig.label}
            </span>
            {categoryConfig && (
              <span className="text-xs text-[#6B5344]">{categoryConfig.label}</span>
            )}
          </div>

          {/* Name */}
          <h3 className="font-serif text-lg text-[#2C1810] mb-2 line-clamp-2">
            {card.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-[#6B5344] mb-3 line-clamp-3">{card.description}</p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-xs text-[#6B5344] mb-3">
            {card.duration_hours && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{card.duration_hours}h</span>
              </div>
            )}
            {card.estimated_cost && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{card.estimated_cost}</span>
              </div>
            )}
            {card.location_name && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{card.location_name}</span>
              </div>
            )}
          </div>

          {/* View button */}
          <button
            onClick={onClick}
            className="w-full py-2.5 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-lg font-medium hover:shadow-md transition-shadow flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            View Experience
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
