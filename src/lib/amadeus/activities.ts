import type { AmadeusActivityData } from "amadeus";
import amadeus, { isAmadeusConfigured } from "./client";
import { geocodeDestination, isGooglePlacesConfigured } from "../google/places";

export interface AmadeusActivity {
  id: string;
  name: string;
  shortDescription: string;
  description?: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  rating?: string;
  reviewCount?: number;
  bookingLink: string;
  pictures?: string[];
  duration?: string;
  categories?: string[];
  geoCode?: {
    latitude: number;
    longitude: number;
  };
}

export interface ActivitySearchParams {
  latitude: number;
  longitude: number;
  radius?: number; // km, default 100 for ~1h drive
}

// Search for activities near a location with pagination
export async function searchActivities(
  params: ActivitySearchParams,
  maxResults: number = 100
): Promise<AmadeusActivity[]> {
  if (!isAmadeusConfigured()) {
    console.warn("Amadeus API not configured - returning empty results");
    return [];
  }

  try {
    const allActivities: AmadeusActivity[] = [];
    const pageSize = 50; // Amadeus typically supports up to 50 per page
    let offset = 0;

    // Fetch multiple pages until we hit maxResults or run out of data
    while (allActivities.length < maxResults) {
      console.log(`[AMADEUS] Fetching page at offset ${offset} (have ${allActivities.length} so far)`);

      const response = await amadeus.shopping.activities.get({
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius || 100,
        'page[offset]': offset,
        'page[limit]': pageSize,
      } as any);

      const pageData = response.data || [];

      if (pageData.length === 0) {
        console.log(`[AMADEUS] No more results at offset ${offset}`);
        break; // No more results
      }

      // Transform and add activities from this page
      const pageActivities = pageData.map((activity: AmadeusActivityData) => ({
        id: activity.id,
        name: activity.name,
        shortDescription: activity.shortDescription || "",
        description: activity.description,
        price: activity.price,
        rating: activity.rating,
        reviewCount: activity.reviewCount,
        bookingLink: activity.bookingLink,
        pictures: activity.pictures,
        duration: activity.duration || activity.minimumDuration,
        categories: activity.categories,
        geoCode: activity.geoCode,
      }));

      allActivities.push(...pageActivities);
      console.log(`[AMADEUS] Page fetched ${pageData.length} activities (total: ${allActivities.length})`);

      // If we got fewer results than requested, we've reached the end
      if (pageData.length < pageSize) {
        console.log(`[AMADEUS] Reached end of results (got ${pageData.length} < ${pageSize})`);
        break;
      }

      offset += pageSize;

      // Small delay to avoid rate limiting
      if (allActivities.length < maxResults) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const limitedActivities = allActivities.slice(0, maxResults);
    console.log(`[AMADEUS] Returning ${limitedActivities.length} activities (limited from ${allActivities.length})`);

    return limitedActivities;
  } catch (error) {
    console.error("Amadeus API error:", error);
    return [];
  }
}

// Unified experience format for AI prompts
export interface UnifiedExperience {
  source: "amadeus" | "google_places";
  id: string;
  name: string;
  description: string;
  price: {
    amount: number | null;
    currency: string;
    display: string;
  };
  duration: string | null;
  rating: number | null;
  reviewCount: number | null;
  categories: string[];
  bookingUrl: string | null;
  pictureUrl: string | null;
  location: {
    name: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

// Convert Amadeus activities to unified format
export function convertAmadeusToUnified(activities: AmadeusActivity[]): UnifiedExperience[] {
  return activities.map((activity) => {
    const priceAmount = activity.price?.amount ? parseFloat(activity.price.amount) : null;
    const priceCurrency = activity.price?.currencyCode || "USD";

    return {
      source: "amadeus" as const,
      id: activity.id,
      name: activity.name,
      description: activity.shortDescription || activity.description || "",
      price: {
        amount: priceAmount,
        currency: priceCurrency,
        display: priceAmount ? `${priceCurrency} ${priceAmount}` : "Price varies",
      },
      duration: activity.duration || null,
      rating: activity.rating ? parseFloat(activity.rating) : null,
      reviewCount: activity.reviewCount || null,
      categories: activity.categories || ["General"],
      bookingUrl: activity.bookingLink,
      pictureUrl: activity.pictures?.[0] || null,
      location: {
        name: null,
        address: null,
        latitude: activity.geoCode?.latitude || null,
        longitude: activity.geoCode?.longitude || null,
      },
    };
  });
}

// Format activities for AI prompt (unified JSON format)
export function formatActivitiesForPrompt(
  activities: AmadeusActivity[],
  currency: string = "USD"
): string {
  if (activities.length === 0) {
    return "";
  }

  const unified = convertAmadeusToUnified(activities);
  return JSON.stringify(unified, null, 2);
}

// Geocoding using known destinations + Google Places API fallback
export async function getDestinationCoordinates(
  destinationName: string,
  country: string | null
): Promise<{ latitude: number; longitude: number } | null> {
  // Common destination coordinates (fast fallback)
  const knownDestinations: Record<string, { latitude: number; longitude: number }> = {
    "cape town": { latitude: -33.9249, longitude: 18.4241 },
    "johannesburg": { latitude: -26.2041, longitude: 28.0473 },
    "kruger": { latitude: -23.9884, longitude: 31.5547 },
    "paris": { latitude: 48.8566, longitude: 2.3522 },
    "london": { latitude: 51.5074, longitude: -0.1278 },
    "new york": { latitude: 40.7128, longitude: -74.0060 },
    "tokyo": { latitude: 35.6762, longitude: 139.6503 },
    "sydney": { latitude: -33.8688, longitude: 151.2093 },
    "rome": { latitude: 41.9028, longitude: 12.4964 },
    "barcelona": { latitude: 41.3851, longitude: 2.1734 },
    "amsterdam": { latitude: 52.3676, longitude: 4.9041 },
    "dubai": { latitude: 25.2048, longitude: 55.2708 },
    "bangkok": { latitude: 13.7563, longitude: 100.5018 },
    "singapore": { latitude: 1.3521, longitude: 103.8198 },
    "bali": { latitude: -8.3405, longitude: 115.0920 },
    "maldives": { latitude: 3.2028, longitude: 73.2207 },
    "santorini": { latitude: 36.3932, longitude: 25.4615 },
    "lisbon": { latitude: 38.7223, longitude: -9.1393 },
    "vienna": { latitude: 48.2082, longitude: 16.3738 },
    "prague": { latitude: 50.0755, longitude: 14.4378 },
    "berlin": { latitude: 52.5200, longitude: 13.4050 },
    "madrid": { latitude: 40.4168, longitude: -3.7038 },
    "milan": { latitude: 45.4642, longitude: 9.1900 },
    "florence": { latitude: 43.7696, longitude: 11.2558 },
    "venice": { latitude: 45.4408, longitude: 12.3155 },
    "munich": { latitude: 48.1351, longitude: 11.5820 },
    "zurich": { latitude: 47.3769, longitude: 8.5417 },
    "oslo": { latitude: 59.9139, longitude: 10.7522 },
    "stockholm": { latitude: 59.3293, longitude: 18.0686 },
    "copenhagen": { latitude: 55.6761, longitude: 12.5683 },
    "hong kong": { latitude: 22.3193, longitude: 114.1694 },
    "seoul": { latitude: 37.5665, longitude: 126.9780 },
    "beijing": { latitude: 39.9042, longitude: 116.4074 },
    "shanghai": { latitude: 31.2304, longitude: 121.4737 },
    "melbourne": { latitude: -37.8136, longitude: 144.9631 },
    "auckland": { latitude: -36.8485, longitude: 174.7633 },
    "queenstown": { latitude: -45.0312, longitude: 168.6626 },
    "buenos aires": { latitude: -34.6037, longitude: -58.3816 },
    "rio de janeiro": { latitude: -22.9068, longitude: -43.1729 },
    "mexico city": { latitude: 19.4326, longitude: -99.1332 },
    "los angeles": { latitude: 34.0522, longitude: -118.2437 },
    "san francisco": { latitude: 37.7749, longitude: -122.4194 },
    "miami": { latitude: 25.7617, longitude: -80.1918 },
    "hawaii": { latitude: 21.3069, longitude: -157.8583 },
    "cancun": { latitude: 21.1619, longitude: -86.8515 },
    "phuket": { latitude: 7.8804, longitude: 98.3923 },
    "krabi": { latitude: 8.0863, longitude: 98.9063 },
    "marrakech": { latitude: 31.6295, longitude: -7.9811 },
    "cairo": { latitude: 30.0444, longitude: 31.2357 },
    "istanbul": { latitude: 41.0082, longitude: 28.9784 },
    "athens": { latitude: 37.9838, longitude: 23.7275 },
    "mykonos": { latitude: 37.4467, longitude: 25.3289 },
    "dubrovnik": { latitude: 42.6507, longitude: 18.0944 },
    "reykjavik": { latitude: 64.1466, longitude: -21.9426 },
  };

  const searchKey = destinationName.toLowerCase().trim();

  // Check known destinations first (fast)
  for (const [key, coords] of Object.entries(knownDestinations)) {
    if (searchKey.includes(key) || key.includes(searchKey)) {
      console.log(`Found ${destinationName} in known destinations`);
      return coords;
    }
  }

  // Try Google Places API for geocoding
  if (isGooglePlacesConfigured()) {
    console.log(`Geocoding ${destinationName} via Google Places API...`);
    const result = await geocodeDestination(destinationName, country);
    if (result) {
      console.log(`Google Places found: ${result.formattedAddress}`);
      return {
        latitude: result.latitude,
        longitude: result.longitude,
      };
    }
  }

  console.warn(`Unknown destination: ${destinationName} - no coordinates available`);
  return null;
}
