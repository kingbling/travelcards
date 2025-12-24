import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJourneyAccess, isJourneyAuthSuccess } from "@/lib/api/journey-auth";
import { generateWelcomeMessage, type WelcomeMessageContext } from "@/lib/ai/generate-welcome";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const result = await verifyJourneyAccess(slug);
  if (!isJourneyAuthSuccess(result)) {
    return result.response;
  }

  const supabase = await createClient();

  // Get intro love letter
  const { data: letter, error } = await supabase
    .from("love_letters")
    .select("title, content")
    .eq("journey_id", result.journey.id)
    .eq("display_on", "intro")
    .order("order_index", { ascending: true })
    .limit(1)
    .single();

  if (error || !letter) {
    // Generate personalized welcome message and save it
    try {
      // Get journey details for context
      const { data: journeyData } = await supabase
        .from("journeys")
        .select("name, recipient_name, curator_id")
        .eq("id", result.journey.id)
        .single();

      // Get destinations
      const { data: destinations } = await supabase
        .from("destinations")
        .select("id, name, country, start_date, end_date")
        .eq("journey_id", result.journey.id)
        .order("order_index", { ascending: true });

      // Get total card count
      const destIds = destinations?.map((d) => d.id) || [];
      const { count: totalCards } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .in("destination_id", destIds);

      // Get curator name (optional)
      let curatorName: string | undefined;
      if (journeyData?.curator_id) {
        const { data: curatorData } = await supabase
          .from("participants")
          .select("name")
          .eq("journey_id", result.journey.id)
          .eq("is_recipient", false)
          .limit(1)
          .single();
        curatorName = curatorData?.name || undefined;
      }

      const context: WelcomeMessageContext = {
        journeyName: journeyData?.name || "Your Journey",
        recipientName: journeyData?.recipient_name || "Friend",
        curatorName,
        destinations: (destinations || []).map((d) => ({
          name: d.name,
          country: d.country,
          startDate: d.start_date,
          endDate: d.end_date,
        })),
        totalCards: totalCards || 0,
      };

      console.log("[WELCOME] Generating welcome message for", context.recipientName);

      // Generate the message
      const welcomeMessage = await generateWelcomeMessage(context);

      // Save it to database for next time
      await supabase.from("love_letters").insert({
        journey_id: result.journey.id,
        title: welcomeMessage.title,
        content: welcomeMessage.content,
        display_on: "intro",
        order_index: 0,
      });

      console.log("[WELCOME] Generated and saved welcome message");

      return NextResponse.json(welcomeMessage);
    } catch (generateError) {
      console.error("[WELCOME] Failed to generate message:", generateError);

      // Fallback to simple default
      return NextResponse.json({
        title: "Your Adventure Awaits",
        content: "Each card you reveal is a carefully chosen experience, wrapped with love.\n\nReady to begin?",
      });
    }
  }

  return NextResponse.json(letter);
}
