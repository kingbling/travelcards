"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import type { CardLocation } from "@/types";
import type { Destination } from "@/types/database";
import { useMapbox } from "@/hooks/useMapbox";
import { calculateBounds } from "@/lib/map/map-utils";
import { RARITY_PIN_COLORS, MAP_STYLES } from "@/lib/map/mapbox-config";
import { MapPopup } from "./MapPopup";
import { AlertCircle, MapPin } from "lucide-react";

interface JourneyMapProps {
  cards: CardLocation[];
  destinations: Destination[];
  journeyName: string;
}

export function JourneyMap({ cards, destinations, journeyName }: JourneyMapProps) {
  const router = useRouter();
  const [selectedCard, setSelectedCard] = useState<CardLocation | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMapLoad = useCallback(
    (map: mapboxgl.Map) => {
      if (cards.length === 0) return;

      // Fit bounds to show all cards
      const bounds = calculateBounds(cards);
      if (bounds) {
        map.fitBounds(bounds, {
          padding: isMobile ? 40 : 60,
          maxZoom: 12,
        });
      }

      // Add markers for each card
      cards.forEach((card) => {
        const color = RARITY_PIN_COLORS[card.rarity || "common"];

        // Create custom marker element
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = color;
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        el.style.cursor = "pointer";
        el.style.transition = "transform 0.2s";

        // Hover effect
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.2)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        // Click handler
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedCard(card);

          // Get marker position for popup
          const rect = el.getBoundingClientRect();
          setPopupPosition({
            x: rect.left + rect.width / 2,
            y: rect.top,
          });
        });

        // Add marker to map
        new mapboxgl.Marker(el)
          .setLngLat([card.location_lng, card.location_lat])
          .addTo(map);
      });

      // Close popup on map click
      map.on("click", () => {
        setSelectedCard(null);
        setPopupPosition(null);
      });
    },
    [cards, isMobile]
  );

  const { mapContainer, map, isLoaded, error } = useMapbox({ onMapLoad: handleMapLoad });

  // Handle card navigation
  const handleCardClick = (cardId: string) => {
    const slug = window.location.pathname.split("/")[2]; // Extract from URL
    router.push(`/j/${slug}/card/${cardId}`);
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-[#2C1810] mb-2">Map Unavailable</h3>
        <p className="text-[#6B5344] text-sm">{error}</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <MapPin className="w-12 h-12 text-[#C9A227] mx-auto mb-4" />
        <h3 className="font-serif text-xl text-[#2C1810] mb-2">No Cards Revealed Yet</h3>
        <p className="text-[#6B5344] text-sm">
          Reveal cards to see them on the map
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Map info header */}
      <div className="mb-4 text-center">
        <h2 className="font-serif text-2xl text-[#2C1810] mb-1">{journeyName}</h2>
        <p className="text-[#6B5344] text-sm">
          {cards.length} revealed experience{cards.length === 1 ? "" : "s"} across{" "}
          {destinations.length} destination{destinations.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Map container */}
      <div
        ref={mapContainer}
        className={isMobile ? MAP_STYLES.mobileContainer : MAP_STYLES.container}
      />

      {/* Popup overlay */}
      {selectedCard && popupPosition && (
        <MapPopup
          card={selectedCard}
          position={popupPosition}
          onClose={() => {
            setSelectedCard(null);
            setPopupPosition(null);
          }}
          onClick={() => handleCardClick(selectedCard.id)}
        />
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {Object.entries(RARITY_PIN_COLORS).map(([rarity, color]) => {
          const count = cards.filter((c) => c.rarity === rarity).length;
          if (count === 0) return null;

          return (
            <div key={rarity} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-[#6B5344] capitalize">
                {rarity} ({count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
