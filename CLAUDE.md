# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Katl.in is a Next.js 16 application that creates personalized travel experience journeys. Curators generate AI-powered travel cards for recipients, who reveal them progressively based on a quota system. The app integrates with Supabase (database/auth), Anthropic Claude (AI generation), Amadeus API (tours/activities), and Google Places API (restaurants/attractions).

## Development Commands

```bash
# Development
npm run dev          # Start dev server on localhost:3000

# Building
npm run build        # Production build (includes TypeScript type checking)

# Production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint
```

## Database Management (Supabase)

```bash
# Local development
npx supabase start                    # Start local Supabase
npx supabase db reset                 # Reset local DB to migrations
npx supabase migration new <name>     # Create new migration

# Remote operations
npx supabase db push                  # Push migrations to remote
npx supabase db pull                  # Pull schema from remote
```

**Migration naming convention**: `YYYYMMDDHHMMSS_description.sql`

**Important**: Always read the existing migration files to understand the schema evolution before creating new migrations.

## Architecture Overview

### Data Model Hierarchy

```
journeys (curator creates)
  └─ participants (travelers)
  └─ destinations
  │    └─ chapters (optional grouping)
  │    │    └─ cards (AI-generated experiences)
  │    └─ cards (can belong directly to destination)
  │    └─ waypoints (for road trips)
  └─ treats (journey-wide surprise rewards)
  └─ love_letters (personal messages)
  └─ reveals (reveal history)
  └─ memories (user notes after experience)
       └─ memory_photos
```

**Key Relationships**:
- `journeys` → `destinations` → `cards` (nested structure)
- `cards.reveal_date` + `reveals_per_week` → quota system
- `reveals` table tracks history for rolling 7-day quota window

### Critical State Fields

**Cards**:
- `is_revealed`: Current state (true/false)
- `revealed_at`: When revealed (timestamp)
- `reveal_date`: When card BECOMES available to reveal (date only)
- `experience_date`: When activity happens
- `status`: `draft | approved | rejected` (workflow)

**Journeys**:
- `reveals_per_week`: Max cards recipient can reveal per week (default: 2)
- `advance_reveal_days`: How early to reveal before experience_date (default: 7)
- `reveal_first_immediately`: First card bypasses reveal_date (boolean)
- `reveal_card_choices`: Number of mystery cards shown (1-4)

### Authentication & Authorization Pattern

**Server Components** (pages):
```typescript
const supabase = await createClient();  // from @/lib/supabase/server
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");

// Filter by ownership
.eq("curator_id", user.id)
```

**Client Components**:
```typescript
const supabase = createClient();  // from @/lib/supabase/client
```

**API Routes** (`/api/admin/*`):
```typescript
// 1. Verify authentication
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// 2. Verify ownership
const { data: journey } = await supabase
  .from("journeys")
  .select("id")
  .eq("id", journeyId)
  .eq("curator_id", user.id)
  .single();

if (!journey) return NextResponse.json({ error: "Journey not found" }, { status: 404 });
```

**Service Role Client** (bypasses RLS for admin operations):
```typescript
import { createServiceClient } from "@/lib/supabase/server";
const supabase = createServiceClient();  // Requires SUPABASE_SERVICE_ROLE_KEY
```

### Reveal Quota System

Located in `/src/lib/api/reveal-quota.ts`:

**Rolling 7-Day Window**:
- Window starts at first reveal timestamp
- Lasts 604800000ms (7 days) from that reveal
- When expired, next reveal starts new window
- No reveals in 7 days = inactive window (quota resets)

**Denial Reasons** (from `RevealDenialReason` type):
- `already_revealed`: Card already revealed
- `quota_exceeded`: Weekly quota exhausted
- `not_found`: Card doesn't exist or isn't approved

**Curator Preview Mode**: If `card.reveal_date === null`, quota is bypassed (for testing).

**Reset Logic**: Deleting records from `reveals` table resets quota calculation.

### AI Card Generation Flow

**Endpoint**: `POST /api/admin/generate`

**Data Sources** (in priority order):
1. **Amadeus API**: Bookable tours/activities (via `/lib/amadeus/activities.ts`)
2. **Google Places API**: Restaurants, attractions (via `/lib/google/places.ts`)
3. **Claude AI Knowledge**: Fallback when no external data

**Generation Process**:
1. Fetch destination coordinates (`getDestinationCoordinates`)
2. Search Amadeus within 100km radius
3. Search Google Places with 6 query types (restaurants, things to do, etc.)
4. Dedupe by `placeId`, combine into unified JSON schema
5. Stream to Claude Sonnet 4 with extended thinking (10k tokens)
6. Claude returns JSON array of cards
7. Dedupe against existing cards
8. Save to database as `status: 'approved'`

**Unified Experience Schema**:
```typescript
{
  source: "amadeus" | "google_places",
  id: string,           // Use as amadeusActivityId if source=amadeus
  name: string,
  bookingUrl?: string,
  pictureUrl?: string,
  price: { display: string },
  location: { address, lat, lng }
}
```

**Prompt Strategy**:
- With external data: "Prioritize real experiences from JSON, supplement with 2-3 free local gems"
- Without external data: "40% free, 30% cheap (<$20), 20% moderate, 10% splurge"

### Page Routing Structure

**Admin Pages** (`/admin/journeys/[id]/`):
- `page.tsx` - Journey overview, quick actions
- `cards/page.tsx` - View/edit/delete cards
- `schedule/page.tsx` - Set reveal dates, journey settings
- `generate/page.tsx` - AI card generation with SSE streaming
- `notes/page.tsx` - Love letters (personal messages)
- `edit/page.tsx` - Multi-step journey creation form

**Recipient Pages** (`/j/[slug]/`):
- `intro/page.tsx` - Journey introduction
- `journey/page.tsx` - Current card reveal (respects quota)
- `destination/[id]/page.tsx` - Destination with reveal mechanism
- `card/[id]/page.tsx` - Individual card detail
- `collection/page.tsx` - All revealed cards gallery

### Component Patterns

**Server Components** (default):
- Fetch data with `await supabase.from()...`
- Can use `cookies()`, `headers()`, `redirect()`
- No useState, useEffect, event handlers

**Client Components** (`"use client"`):
- Interactive UI (forms, modals, toasts)
- Use Supabase client-side SDK
- Event handlers, state management

**Hybrid Pattern** (common):
- Server component fetches data, passes to client component as props
- Example: Journey page (server) renders ResetQuickAction (client)

### External API Integration

**Amadeus** (`/lib/amadeus/activities.ts`):
- Requires `AMADEUS_CLIENT_ID` + `AMADEUS_CLIENT_SECRET`
- OAuth token auto-refreshes
- Returns bookable tours with pricing

**Google Places** (`/lib/google/places.ts`):
- Requires `GOOGLE_PLACES_API_KEY`
- Text search for restaurants/attractions
- Returns place details with coordinates

**Anthropic** (`/lib/ai/generate-cards.ts`):
- Uses `@anthropic-ai/sdk` with streaming
- Model: `claude-sonnet-4-20250514`
- Extended thinking: 10k token budget
- Web search tool enabled (max 5 uses)

### Type System

**Database Types**: `/src/types/database.ts` contains:
- Auto-generated Supabase schema types (regenerate with `npx supabase gen types typescript`)
- Application-specific types (`CardCategory`, `TargetProfile`, `Rarity`, etc.)
- Config objects (`CATEGORY_CONFIG`, `RARITY_CONFIG`, `PROFILE_CONFIG`)
- Convenience type aliases (`Journey`, `Card`, `Destination`, etc.)

**Re-exports**: `/src/types/index.ts` re-exports common types for cleaner imports

**Key Application Types**:
```typescript
export type CardCategory = "food" | "wine" | "animals" | "art" | "nature" | "culture" | "adventure" | "family" | "spa" | "music"
export type TargetProfile = "solo" | "couple" | "family" | "kids"
export type Rarity = "common" | "uncommon" | "rare" | "legendary"
```

**Config Objects**: `CATEGORY_CONFIG`, `RARITY_CONFIG`, `PROFILE_CONFIG` map types to display properties (icons, colors, labels).

### Environment Variables

Required (see `.env.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

Optional:
```
SUPABASE_SERVICE_ROLE_KEY=   # For admin operations bypassing RLS
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
GOOGLE_PLACES_API_KEY=
MAPBOX_ACCESS_TOKEN=         # For map features
```

### Common Gotchas

1. **Null Handling**: Most database fields are nullable. Use type guards or `??` defaults.

2. **Async Route Params**: Next.js 16 requires `await params`:
   ```typescript
   const { id } = await params;  // NOT: params.id directly
   ```

3. **Server vs Client Imports**:
   - Server: `@/lib/supabase/server` (uses cookies)
   - Client: `@/lib/supabase/client` (uses localStorage)

4. **Date Formats**:
   - `reveal_date`, `experience_date`: `YYYY-MM-DD` (date only, no time)
   - `revealed_at`, `created_at`: ISO 8601 timestamp with timezone

5. **Quota Bypass**: Cards with `reveal_date = null` bypass quota checks (curator preview mode).

6. **Transaction Limitations**: Supabase JS client doesn't support transactions. Use sequential operations or database functions for atomicity.

7. **TypeScript Strictness**: Enable `strictNullChecks`. The codebase uses type predicates for filtering:
   ```typescript
   .filter((d): d is string => Boolean(d))
   ```

### Debugging Tools

**Console Logging Conventions**:
- `[AMADEUS]` - Amadeus API operations
- `[GOOGLE]` - Google Places API operations
- `[RESET]` - Journey reset operations
- `[QUOTA]` - Reveal quota calculations

**Generation Debug UI**:
- "Research Data" tab shows Amadeus vs Google Places JSON
- "AI Reasoning" tab shows Claude's thinking process
- Token usage and cost displayed in stats

### Migration Strategy

When modifying schema:
1. Create migration: `npx supabase migration new <name>`
2. Write SQL in `/supabase/migrations/`
3. Test locally: `npx supabase db reset`
4. Deploy: `npx supabase db push`
5. Regenerate types: `npx supabase gen types typescript --local` (copy relevant parts to `src/types/database.ts`)

**RLS (Row Level Security)**: Some tables use RLS policies. Check Supabase dashboard for policy definitions.
