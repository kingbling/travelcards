// Unsplash API integration for destination photos
// Uses the free Unsplash API for beautiful travel imagery

const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || "";

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
  blur_hash: string | null;
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

// In-memory cache with 1 hour TTL
const photoCache = new Map<string, { photo: UnsplashPhoto; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Search for a destination/country photo on Unsplash
 * Returns a beautiful travel photo for the given location
 */
export async function getDestinationPhoto(
  destination: string,
  country?: string | null
): Promise<UnsplashPhoto | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn("[UNSPLASH] No API key configured");
    return null;
  }

  // Create cache key
  const cacheKey = `${destination}-${country || ""}`.toLowerCase();

  // Check cache
  const cached = photoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.photo;
  }

  try {
    // Build search query - use city/destination name prominently
    // Format: "Rome Italy city" or "Paris landmark"
    const query = country
      ? `${destination} ${country} city`
      : `${destination} landmark city`;

    console.log(`[UNSPLASH] Searching for: "${query}"`);

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "3"); // Get a few options
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high"); // Family-friendly

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      console.error("[UNSPLASH] API error:", res.status, await res.text());
      return null;
    }

    const data: UnsplashSearchResponse = await res.json();
    console.log(`[UNSPLASH] Found ${data.total} results for "${query}"`);

    if (data.results.length === 0) {
      // Fallback: try just the destination name
      if (country) {
        console.log(`[UNSPLASH] No results, trying just: "${destination}"`);
        return getDestinationPhoto(destination, null);
      }
      // Last resort: try just the country
      if (country) {
        console.log(`[UNSPLASH] No results, trying country: "${country}"`);
        return getDestinationPhoto(country, null);
      }
      return null;
    }

    // Pick the first result
    const photo = data.results[0];
    console.log(`[UNSPLASH] Selected photo: ${photo.id} by ${photo.user.name}`);

    // Cache the result
    photoCache.set(cacheKey, { photo, timestamp: Date.now() });

    return photo;
  } catch (error) {
    console.error("[UNSPLASH] Error fetching photo:", error);
    return null;
  }
}

/**
 * Get multiple destination photos for a list of destinations
 * Useful for the journey overview page
 */
export async function getDestinationPhotos(
  destinations: Array<{ name: string; country: string | null }>
): Promise<Map<string, UnsplashPhoto | null>> {
  const results = new Map<string, UnsplashPhoto | null>();

  // Fetch in parallel with a small delay to respect rate limits
  const promises = destinations.map(async (dest, index) => {
    // Small stagger to avoid rate limiting (50 requests/hour on free tier)
    await new Promise(resolve => setTimeout(resolve, index * 100));
    const photo = await getDestinationPhoto(dest.name, dest.country);
    results.set(dest.name, photo);
  });

  await Promise.all(promises);
  return results;
}

/**
 * Get the optimized URL for a given size
 * Unsplash allows dynamic sizing via URL params
 */
export function getOptimizedPhotoUrl(
  photo: UnsplashPhoto,
  width: number = 800,
  quality: number = 80
): string {
  // Use raw URL and add size parameters
  return `${photo.urls.raw}&w=${width}&q=${quality}&fit=crop&auto=format`;
}

/**
 * Get attribution text for Unsplash (required by their API terms)
 */
export function getPhotoAttribution(photo: UnsplashPhoto): {
  text: string;
  link: string;
} {
  return {
    text: `Photo by ${photo.user.name} on Unsplash`,
    link: `https://unsplash.com/@${photo.user.username}?utm_source=katlin&utm_medium=referral`,
  };
}
