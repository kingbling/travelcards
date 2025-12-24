import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getDestinationPhoto, getOptimizedPhotoUrl, getPhotoAttribution } from "@/lib/unsplash/photos";

interface DestinationWithPhoto {
  name: string;
  country: string | null;
  cover_photo_url: string | null;
  cover_photo_attribution: { text: string; link: string } | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destinationId = searchParams.get("destinationId");
  const destination = searchParams.get("destination");
  const country = searchParams.get("country");
  const width = parseInt(searchParams.get("width") || "800", 10);

  // If we have a destinationId, try to get cached photo from database
  if (destinationId) {
    const supabase = createServiceClient();

    // Check for cached photo (using type assertion for new columns)
    const { data } = await supabase
      .from("destinations")
      .select("name, country, cover_photo_url, cover_photo_attribution")
      .eq("id", destinationId)
      .single();

    const dest = data as DestinationWithPhoto | null;

    if (dest?.cover_photo_url) {
      // Return cached photo
      return NextResponse.json({
        imageUrl: dest.cover_photo_url,
        attribution: dest.cover_photo_attribution,
        alt: `Photo of ${dest.name}`,
        cached: true,
      });
    }

    // No cached photo, fetch from Unsplash
    const photo = await getDestinationPhoto(dest?.name || destination || "", dest?.country || country);

    if (!photo) {
      return NextResponse.json({ imageUrl: null, error: "No photo found" });
    }

    const imageUrl = getOptimizedPhotoUrl(photo, width);
    const attribution = getPhotoAttribution(photo);

    // Cache in database (using type assertion for new columns)
    await supabase
      .from("destinations")
      .update({
        cover_photo_url: imageUrl,
        cover_photo_attribution: attribution,
      } as Record<string, unknown>)
      .eq("id", destinationId);

    return NextResponse.json({
      imageUrl,
      attribution,
      alt: photo.alt_description || `Photo of ${dest?.name || destination}`,
      cached: false,
    });
  }

  // Fallback: no destinationId, just fetch from Unsplash (no caching)
  if (!destination) {
    return NextResponse.json(
      { error: "Missing destination or destinationId parameter" },
      { status: 400 }
    );
  }

  const photo = await getDestinationPhoto(destination, country);

  if (!photo) {
    return NextResponse.json({ imageUrl: null, error: "No photo found" });
  }

  const imageUrl = getOptimizedPhotoUrl(photo, width);
  const attribution = getPhotoAttribution(photo);

  return NextResponse.json({
    imageUrl,
    attribution,
    alt: photo.alt_description || `Photo of ${destination}`,
  });
}
