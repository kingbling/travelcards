-- TravelCards Database Schema
-- A personalized travel experience card game for family trips

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- The journey structure (the "campaign")
CREATE TABLE journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- Who created this journey
  name TEXT NOT NULL,

  -- Recipient info
  recipient_name TEXT,
  recipient_email TEXT,

  -- Access
  unique_slug TEXT UNIQUE,
  access_code TEXT,  -- 4-digit PIN

  -- Status
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People on the trip (for AI card generation)
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INT,
  role TEXT,  -- wife, husband, daughter, son, friend
  interests TEXT[],  -- ['wine', 'food', 'animals', 'art']
  is_recipient BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Destinations within a journey (Cape Town, Bali, Japan)
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT,
  start_date DATE,
  end_date DATE,
  theme_colors JSONB DEFAULT '{"primary": "#E07B39", "secondary": "#C9A227"}',
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapters within a destination (narrative structure)
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unlock_date DATE,
  reveal_cooldown_hours INT DEFAULT 24,
  card_count INT DEFAULT 1,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experience cards
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,

  -- Core info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('food', 'wine', 'animals', 'art', 'nature', 'culture', 'adventure', 'family', 'spa', 'music')),
  target_profile TEXT CHECK (target_profile IN ('solo', 'couple', 'family', 'kids')),
  rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')) DEFAULT 'common',

  -- Booking details
  estimated_cost TEXT,
  currency TEXT DEFAULT 'USD',
  duration_hours NUMERIC,
  booking_url TEXT,
  booking_method TEXT,
  is_prebooked BOOLEAN DEFAULT FALSE,
  booking_date DATE,

  -- Personalization
  personal_note TEXT,

  -- Admin workflow
  status TEXT CHECK (status IN ('draft', 'approved', 'rejected')) DEFAULT 'draft',
  ai_research JSONB,
  generation_prompt TEXT,

  -- Reveal state
  is_revealed BOOLEAN DEFAULT FALSE,
  revealed_at TIMESTAMP WITH TIME ZONE,
  order_index INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track reveal history
CREATE TABLE reveals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  revealed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Love letters / personal messages
CREATE TABLE love_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  display_on TEXT CHECK (display_on IN ('intro', 'chapter_start', 'destination_start', 'card_reveal')),
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email notification preferences
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  -- Notification toggles
  journey_start BOOLEAN DEFAULT TRUE,
  chapter_unlocked BOOLEAN DEFAULT TRUE,
  card_ready BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT FALSE,
  booking_reminder BOOLEAN DEFAULT TRUE,
  booking_reminder_days INT DEFAULT 3,

  -- State
  is_verified BOOLEAN DEFAULT FALSE,
  last_sent_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memories (photos + notes after completing an experience)
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,

  -- Content
  note TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  completed_at DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory photos (stored in Supabase Storage)
CREATE TABLE memory_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_journeys_curator ON journeys(curator_id);
CREATE INDEX idx_participants_journey ON participants(journey_id);
CREATE INDEX idx_destinations_journey ON destinations(journey_id);
CREATE INDEX idx_chapters_destination ON chapters(destination_id);
CREATE INDEX idx_chapters_unlock_date ON chapters(unlock_date);
CREATE INDEX idx_cards_chapter ON cards(chapter_id);
CREATE INDEX idx_cards_destination ON cards(destination_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_love_letters_journey ON love_letters(journey_id);
CREATE INDEX idx_email_preferences_journey ON email_preferences(journey_id);
CREATE INDEX idx_memories_card ON memories(card_id);
CREATE INDEX idx_memory_photos_memory ON memory_photos(memory_id);
CREATE UNIQUE INDEX idx_journeys_slug ON journeys(unique_slug) WHERE unique_slug IS NOT NULL;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER journeys_updated_at
  BEFORE UPDATE ON journeys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE love_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_photos ENABLE ROW LEVEL SECURITY;

-- Public read access for published journeys (accessed via unique_slug)
CREATE POLICY "Public can read published journeys" ON journeys
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Public can read participants of published journeys" ON participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journeys WHERE journeys.id = participants.journey_id AND journeys.is_published = TRUE
    )
  );

CREATE POLICY "Public can read destinations of published journeys" ON destinations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journeys WHERE journeys.id = destinations.journey_id AND journeys.is_published = TRUE
    )
  );

CREATE POLICY "Public can read chapters of published journeys" ON chapters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM destinations
      JOIN journeys ON journeys.id = destinations.journey_id
      WHERE destinations.id = chapters.destination_id AND journeys.is_published = TRUE
    )
  );

CREATE POLICY "Public can read approved cards of published journeys" ON cards
  FOR SELECT USING (
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM destinations
      JOIN journeys ON journeys.id = destinations.journey_id
      WHERE destinations.id = cards.destination_id AND journeys.is_published = TRUE
    )
  );

CREATE POLICY "Public can read love letters of published journeys" ON love_letters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journeys WHERE journeys.id = love_letters.journey_id AND journeys.is_published = TRUE
    )
  );

-- Public can create reveals (marking cards as revealed)
CREATE POLICY "Public can create reveals" ON reveals
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Public can read reveals" ON reveals
  FOR SELECT USING (TRUE);

-- Public can create and read memories
CREATE POLICY "Public can create memories" ON memories
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Public can read memories" ON memories
  FOR SELECT USING (TRUE);

CREATE POLICY "Public can update memories" ON memories
  FOR UPDATE USING (TRUE);

CREATE POLICY "Public can create memory photos" ON memory_photos
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Public can read memory photos" ON memory_photos
  FOR SELECT USING (TRUE);

-- ============================================
-- CURATOR POLICIES (Authenticated users)
-- ============================================

-- Curators can manage their own journeys
CREATE POLICY "Curators can read own journeys" ON journeys
  FOR SELECT USING (auth.uid() = curator_id);

CREATE POLICY "Curators can create journeys" ON journeys
  FOR INSERT WITH CHECK (auth.uid() = curator_id);

CREATE POLICY "Curators can update own journeys" ON journeys
  FOR UPDATE USING (auth.uid() = curator_id);

CREATE POLICY "Curators can delete own journeys" ON journeys
  FOR DELETE USING (auth.uid() = curator_id);

-- Curators can manage participants of their journeys
CREATE POLICY "Curators can manage participants" ON participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journeys WHERE journeys.id = participants.journey_id AND journeys.curator_id = auth.uid()
    )
  );

-- Curators can manage destinations of their journeys
CREATE POLICY "Curators can manage destinations" ON destinations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journeys WHERE journeys.id = destinations.journey_id AND journeys.curator_id = auth.uid()
    )
  );

-- Curators can manage chapters of their journeys
CREATE POLICY "Curators can manage chapters" ON chapters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM destinations
      JOIN journeys ON journeys.id = destinations.journey_id
      WHERE destinations.id = chapters.destination_id AND journeys.curator_id = auth.uid()
    )
  );

-- Curators can manage cards of their journeys
CREATE POLICY "Curators can manage cards" ON cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM destinations
      JOIN journeys ON journeys.id = destinations.journey_id
      WHERE destinations.id = cards.destination_id AND journeys.curator_id = auth.uid()
    )
  );

-- Curators can manage love letters of their journeys
CREATE POLICY "Curators can manage love letters" ON love_letters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journeys WHERE journeys.id = love_letters.journey_id AND journeys.curator_id = auth.uid()
    )
  );

-- Curators can manage email preferences of their journeys
CREATE POLICY "Curators can manage email preferences" ON email_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journeys WHERE journeys.id = email_preferences.journey_id AND journeys.curator_id = auth.uid()
    )
  );
