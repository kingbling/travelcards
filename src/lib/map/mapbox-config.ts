export const MAPBOX_CONFIG = {
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
  style: "mapbox://styles/mapbox/streets-v12", // Light, travel-friendly style
  defaultCenter: [0, 20] as [number, number],
  defaultZoom: 2,
  minZoom: 1,
  maxZoom: 18,
};

export const MAP_STYLES = {
  container: "w-full h-[600px] rounded-xl overflow-hidden shadow-lg",
  mobileContainer: "w-full h-[70vh] rounded-xl overflow-hidden shadow-lg",
};

// Pin color mapping by rarity
export const RARITY_PIN_COLORS: Record<string, string> = {
  common: "#6B7280",
  uncommon: "#059669",
  rare: "#3B82F6",
  legendary: "#C9A227",
};

// Cluster color
export const CLUSTER_COLOR = "#E07B39";
