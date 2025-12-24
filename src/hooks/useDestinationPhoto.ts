"use client";

import { useState, useEffect } from "react";

interface DestinationPhoto {
  imageUrl: string;
  attribution: {
    text: string;
    link: string;
  } | null;
  alt: string;
  cached?: boolean;
}

interface UseDestinationPhotoOptions {
  destinationId?: string;
  destination?: string;
  country?: string | null;
  width?: number;
}

export function useDestinationPhoto({
  destinationId,
  destination,
  country,
  width = 800,
}: UseDestinationPhotoOptions) {
  const [photo, setPhoto] = useState<DestinationPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPhoto() {
      if (!destinationId && !destination) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params = new URLSearchParams({ width: width.toString() });

        // Prefer destinationId for caching
        if (destinationId) {
          params.set("destinationId", destinationId);
        } else if (destination) {
          params.set("destination", destination);
        }

        if (country) {
          params.set("country", country);
        }

        const res = await fetch(`/api/photos/destination?${params}`);
        const data = await res.json();

        if (data.imageUrl) {
          setPhoto(data);
        } else {
          setPhoto(null);
        }
        setError(null);
      } catch (err) {
        console.error("[useDestinationPhoto] Error:", err);
        setError("Failed to load photo");
        setPhoto(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPhoto();
  }, [destinationId, destination, country, width]);

  return { photo, loading, error };
}

// For batch fetching multiple destinations (journey timeline)
export function useDestinationPhotos(
  destinations: Array<{ id: string; name: string; country: string | null }>
) {
  const [photos, setPhotos] = useState<Map<string, DestinationPhoto | null>>(new Map());
  const [loading, setLoading] = useState(true);

  // Create a stable key from destination IDs to prevent infinite re-fetches
  const destinationKey = destinations.map(d => d.id).sort().join(",");

  useEffect(() => {
    if (!destinationKey) {
      setLoading(false);
      return;
    }

    // Parse IDs from the key to avoid dependency on destinations array
    const ids = destinationKey.split(",").filter(Boolean);

    async function fetchPhotos() {
      const results = new Map<string, DestinationPhoto | null>();

      // Fetch photos in parallel
      await Promise.all(
        ids.map(async (destId) => {
          try {
            const params = new URLSearchParams({
              destinationId: destId,
              width: "400",
            });

            const res = await fetch(`/api/photos/destination?${params}`);
            const data = await res.json();

            results.set(destId, data.imageUrl ? data : null);
          } catch {
            results.set(destId, null);
          }
        })
      );

      setPhotos(results);
      setLoading(false);
    }

    fetchPhotos();
  }, [destinationKey]);

  return { photos, loading };
}
