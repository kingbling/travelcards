-- Add journey_id to reveals table for easier quota queries
ALTER TABLE reveals ADD COLUMN IF NOT EXISTS journey_id uuid REFERENCES journeys(id) ON DELETE CASCADE;

-- Backfill existing reveals with journey_id
UPDATE reveals r
SET journey_id = (
  SELECT d.journey_id
  FROM cards c
  JOIN destinations d ON c.destination_id = d.id
  WHERE c.id = r.card_id
);

-- Make it required after backfill
ALTER TABLE reveals ALTER COLUMN journey_id SET NOT NULL;

-- Add index for quota queries
CREATE INDEX IF NOT EXISTS idx_reveals_journey_date ON reveals(journey_id, revealed_at);
