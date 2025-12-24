-- ============================================================================
-- Treats Feature: Journey-wide small surprises
-- ============================================================================

-- Treats table (journey-scoped)
CREATE TABLE treats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,

  -- Content fields
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  rarity TEXT DEFAULT 'common',
  picture_url TEXT,
  estimated_cost TEXT,

  -- Generation metadata
  generation_prompt TEXT,

  -- Reveal state (no reveal_date or experience_date - quota-based only)
  is_revealed BOOLEAN DEFAULT FALSE,
  revealed_at TIMESTAMP WITH TIME ZONE,

  -- Ordering
  order_index INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treat reveals table (for quota tracking)
CREATE TABLE treat_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treat_id UUID NOT NULL REFERENCES treats(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  revealed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add treats quota setting to journeys
ALTER TABLE journeys ADD COLUMN treats_per_week INT DEFAULT 1;
ALTER TABLE journeys ADD CONSTRAINT treats_per_week_range CHECK (treats_per_week >= 1 AND treats_per_week <= 5);

-- Indexes for performance
CREATE INDEX idx_treats_journey ON treats(journey_id);
CREATE INDEX idx_treats_journey_revealed ON treats(journey_id, is_revealed);
CREATE INDEX idx_treats_order ON treats(journey_id, order_index);
CREATE INDEX idx_treat_reveals_journey_date ON treat_reveals(journey_id, revealed_at);
CREATE INDEX idx_treat_reveals_treat ON treat_reveals(treat_id);

-- Row Level Security
ALTER TABLE treats ENABLE ROW LEVEL SECURITY;
ALTER TABLE treat_reveals ENABLE ROW LEVEL SECURITY;

-- Public can read treats of published journeys
CREATE POLICY "Public read treats of published journeys" ON treats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = treats.journey_id
      AND journeys.is_published = TRUE
    )
  );

-- Curators can manage treats of their journeys
CREATE POLICY "Curators manage treats" ON treats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journeys
      WHERE journeys.id = treats.journey_id
      AND journeys.curator_id = auth.uid()
    )
  );

-- Public can create and read treat reveals
CREATE POLICY "Public create treat reveals" ON treat_reveals
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Public read treat reveals" ON treat_reveals
  FOR SELECT USING (TRUE);

-- Updated at trigger for treats
CREATE TRIGGER treats_updated_at
  BEFORE UPDATE ON treats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
