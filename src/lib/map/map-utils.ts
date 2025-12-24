import type { CardLocation } from "@/types";
import type { LngLatBoundsLike } from "mapbox-gl";

/**
 * Calculate bounding box from card locations with padding
 */
export function calculateBounds(cards: CardLocation[]): LngLatBoundsLike | null {
  if (cards.length === 0) return null;

  const lats = cards.map((c) => c.location_lat);
  const lngs = cards.map((c) => c.location_lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Add 10% padding
  const latPadding = (maxLat - minLat) * 0.1 || 0.1;
  const lngPadding = (maxLng - minLng) * 0.1 || 0.1;

  return [
    [minLng - lngPadding, minLat - latPadding],
    [maxLng + lngPadding, maxLat + latPadding],
  ];
}

/**
 * Get center point from cards
 */
export function getCenterPoint(cards: CardLocation[]): [number, number] {
  if (cards.length === 0) return [0, 20];

  const avgLat = cards.reduce((sum, c) => sum + c.location_lat, 0) / cards.length;
  const avgLng = cards.reduce((sum, c) => sum + c.location_lng, 0) / cards.length;

  return [avgLng, avgLat];
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}
