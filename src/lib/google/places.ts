// Google Places API client for geocoding and place discovery

import { getCurrencyForCountry, formatPriceWithUSD } from "@/lib/currency/exchange";
import { googleLogger } from "@/lib/logger";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export function isGooglePlacesConfigured(): boolean {
  return !!GOOGLE_PLACES_API_KEY;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId: string;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  photos?: string[];
  openNow?: boolean;
  website?: string;
}

// Geocode a destination name to coordinates
export async function geocodeDestination(
  destinationName: string,
  country?: string | null
): Promise<GeocodeResult | null> {
  if (!isGooglePlacesConfigured()) {
    googleLogger.warn("API not configured");
    return null;
  }

  try {
    const query = country
      ? `${destinationName}, ${country}`
      : destinationName;

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY!);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" || !data.results?.length) {
      googleLogger.warn(`Geocoding failed for ${query}: ${data.status}`);
      return null;
    }

    const result = data.results[0];
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    };
  } catch (error) {
    googleLogger.error("Geocoding error:", error);
    return null;
  }
}

// Search for nearby places (restaurants, attractions, etc.)
export async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  type: string = "tourist_attraction",
  radius: number = 10000 // 10km default
): Promise<PlaceResult[]> {
  if (!isGooglePlacesConfigured()) {
    googleLogger.warn("API not configured");
    return [];
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${latitude},${longitude}`);
    url.searchParams.set("radius", radius.toString());
    url.searchParams.set("type", type);
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY!);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" || !data.results?.length) {
      return [];
    }

    return data.results.map((place: Record<string, unknown>) => ({
      placeId: place.place_id as string,
      name: place.name as string,
      address: place.vicinity as string,
      rating: place.rating as number | undefined,
      userRatingsTotal: place.user_ratings_total as number | undefined,
      priceLevel: place.price_level as number | undefined,
      types: (place.types as string[]) || [],
      location: {
        latitude: (place.geometry as { location: { lat: number; lng: number } }).location.lat,
        longitude: (place.geometry as { location: { lat: number; lng: number } }).location.lng,
      },
      photos: (place.photos as { photo_reference: string }[] | undefined)?.map(
        (p) => getPhotoUrl(p.photo_reference)
      ),
      openNow: (place.opening_hours as { open_now?: boolean } | undefined)?.open_now,
    }));
  } catch (error) {
    googleLogger.error("Nearby search error:", error);
    return [];
  }
}

// Text search for specific places using New Places API (v1) with pagination
export async function textSearchPlaces(
  query: string,
  latitude?: number,
  longitude?: number,
  maxPages: number = 3 // Fetch up to 3 pages (60 results max)
): Promise<PlaceResult[]> {
  if (!isGooglePlacesConfigured()) {
    googleLogger.warn("API not configured - missing GOOGLE_PLACES_API_KEY");
    return [];
  }

  try {
    const url = "https://places.googleapis.com/v1/places:searchText";
    const allPlaces: PlaceResult[] = [];
    let nextPageToken: string | undefined = undefined;
    let pageCount = 0;

    // Helper function to parse place data
    const parsePlace = (place: Record<string, unknown>): PlaceResult => {
      const displayName = place.displayName as { text: string } | undefined;
      const location = place.location as { latitude: number; longitude: number } | undefined;
      const photos = place.photos as { name: string }[] | undefined;
      const openingHours = place.currentOpeningHours as { openNow?: boolean } | undefined;

      // Convert price level enum to number
      const priceLevelMap: Record<string, number> = {
        'PRICE_LEVEL_FREE': 0,
        'PRICE_LEVEL_INEXPENSIVE': 1,
        'PRICE_LEVEL_MODERATE': 2,
        'PRICE_LEVEL_EXPENSIVE': 3,
        'PRICE_LEVEL_VERY_EXPENSIVE': 4
      };
      const priceLevelStr = place.priceLevel as string | undefined;
      const priceLevel = priceLevelStr ? priceLevelMap[priceLevelStr] : undefined;

      return {
        placeId: place.id as string,
        name: displayName?.text || 'Unknown',
        address: place.formattedAddress as string || '',
        rating: place.rating as number | undefined,
        userRatingsTotal: place.userRatingCount as number | undefined,
        priceLevel,
        types: (place.types as string[]) || [],
        location: {
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
        },
        photos: photos?.slice(0, 1).map(p => getPhotoUrlV1(p.name)),
        openNow: openingHours?.openNow,
        website: place.websiteUri as string | undefined,
      };
    };

    googleLogger.info(`Searching: "${query}" ${latitude && longitude ? `near ${latitude},${longitude}` : ''}`);

    // Fetch multiple pages
    do {
      const requestBody: Record<string, unknown> = {
        textQuery: query,
        pageSize: 20, // Max is 20 per Google Places API v1
      };

      // Add location bias if coordinates provided
      if (latitude && longitude) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude,
              longitude
            },
            radius: 20000.0 // 20km radius
          }
        };
      }

      // Add page token for subsequent requests
      if (nextPageToken) {
        requestBody.pageToken = nextPageToken;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY!,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.types,places.location,places.photos,places.currentOpeningHours,places.websiteUri,nextPageToken'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        googleLogger.error(`HTTP ${response.status}:`, errorText);
        break;
      }

      const data = await response.json();

      if (!data.places || data.places.length === 0) {
        googleLogger.warn(`No results on page ${pageCount + 1} for "${query}"`);
        break;
      }

      // Parse and add places from this page
      const pagePlaces = data.places.map(parsePlace);
      allPlaces.push(...pagePlaces);
      pageCount++;

      googleLogger.debug(`Page ${pageCount}: Found ${pagePlaces.length} results (total: ${allPlaces.length})`);

      // Check for next page token
      nextPageToken = data.nextPageToken as string | undefined;

      // Small delay to avoid rate limiting
      if (nextPageToken && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } while (nextPageToken && pageCount < maxPages);

    googleLogger.info(`Completed search for "${query}": ${allPlaces.length} total results from ${pageCount} pages`);

    return allPlaces;
  } catch (error) {
    googleLogger.error("Text search error:", error);
    return [];
  }
}

// Get place details including website
export async function getPlaceDetails(
  placeId: string
): Promise<{ website?: string; phone?: string; url?: string } | null> {
  if (!isGooglePlacesConfigured()) {
    return null;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "website,formatted_phone_number,url");
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY!);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
      return null;
    }

    return {
      website: data.result.website,
      phone: data.result.formatted_phone_number,
      url: data.result.url, // Google Maps URL
    };
  } catch (error) {
    googleLogger.error("Place details error:", error);
    return null;
  }
}

// Get photo URL from reference (legacy API)
function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

// Get photo URL from name (new API v1)
function getPhotoUrlV1(photoName: string, maxWidth: number = 400): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_PLACES_API_KEY}`;
}

// Unified experience format (same as Amadeus)
interface UnifiedExperience {
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

// Convert Google Places to unified format
export async function convertPlacesToUnified(
  places: PlaceResult[],
  country: string | null = null
): Promise<UnifiedExperience[]> {
  const localCurrency = getCurrencyForCountry(country);

  // Use Promise.allSettled to handle individual failures gracefully
  const results = await Promise.allSettled(
    places.map(async (place) => {
      try {
        // Convert price level (0-4) to rough estimate with real currency conversion
        const priceUSDEstimates: Record<number, number> = {
          0: 0,   // Free
          1: 10,  // Budget
          2: 25,  // Moderate
          3: 50,  // Expensive
          4: 100, // Luxury
        };

        let priceDisplay = "Price varies";
        let priceAmount: number | null = null;

        if (place.priceLevel !== undefined && priceUSDEstimates[place.priceLevel] !== undefined) {
          const usdAmount = priceUSDEstimates[place.priceLevel];
          priceAmount = usdAmount;

          if (usdAmount === 0) {
            priceDisplay = "Free";
          } else {
            // Get real currency conversion
            try {
              priceDisplay = await formatPriceWithUSD(usdAmount, localCurrency);
            } catch {
              priceDisplay = `~$${usdAmount}`;
            }
          }
        }

        // Safely handle potentially undefined properties
        const types = place.types || [];
        const location = place.location || { latitude: 0, longitude: 0 };

        return {
          source: "google_places" as const,
          id: place.placeId,
          name: place.name || "Unknown",
          description: `${types.slice(0, 3).join(", ")} at ${place.address || "Unknown location"}`,
          price: {
            amount: priceAmount,
            currency: localCurrency,
            display: priceDisplay,
          },
          duration: null, // Google Places doesn't provide duration
          rating: place.rating || null,
          reviewCount: place.userRatingsTotal || null,
          categories: types.slice(0, 5),
          bookingUrl: place.website || null,
          pictureUrl: place.photos?.[0] || null,
          location: {
            name: place.name || null,
            address: place.address || null,
            latitude: location.latitude,
            longitude: location.longitude,
          },
        };
      } catch (error) {
        googleLogger.error(`Error converting place ${place.placeId}:`, error);
        // Return null to filter out failed conversions
        return null;
      }
    })
  );

  // Filter out failed conversions and extract successful results
  const filteredResults: UnifiedExperience[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value !== null) {
      filteredResults.push(result.value);
    }
  }
  return filteredResults;
}

// Format places for AI prompt (unified JSON format)
export async function formatPlacesForPrompt(
  places: PlaceResult[],
  country: string | null = null
): Promise<string> {
  if (places.length === 0) {
    return "";
  }

  const unified = await convertPlacesToUnified(places, country);
  return JSON.stringify(unified, null, 2);
}
