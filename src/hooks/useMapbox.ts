"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MAPBOX_CONFIG } from "@/lib/map/mapbox-config";

interface UseMapboxOptions {
  onMapLoad?: (map: mapboxgl.Map) => void;
}

export function useMapbox({ onMapLoad }: UseMapboxOptions = {}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapInstance.current) return; // Prevent double initialization in Strict Mode

    // Check for access token
    if (!MAPBOX_CONFIG.accessToken) {
      setError("Mapbox access token not configured");
      return;
    }

    mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_CONFIG.style,
        center: MAPBOX_CONFIG.defaultCenter,
        zoom: MAPBOX_CONFIG.defaultZoom,
        minZoom: MAPBOX_CONFIG.minZoom,
        maxZoom: MAPBOX_CONFIG.maxZoom,
      });

      map.on("load", () => {
        setIsLoaded(true);
        onMapLoad?.(map);
      });

      map.on("error", (e) => {
        console.error("[MAP ERROR]", e);
        setError("Failed to load map");
      });

      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      mapInstance.current = map;
    } catch (err) {
      console.error("[MAPBOX INIT ERROR]", err);
      setError("Failed to initialize map");
    }

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [onMapLoad]);

  return {
    mapContainer,
    map: mapInstance.current,
    isLoaded,
    error,
  };
}
