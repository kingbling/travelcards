-- Add Amadeus activity ID to cards for tracking bookable tours
ALTER TABLE cards ADD COLUMN IF NOT EXISTS amadeus_activity_id TEXT;

-- Index for potential lookups
CREATE INDEX IF NOT EXISTS idx_cards_amadeus_activity_id ON cards(amadeus_activity_id) WHERE amadeus_activity_id IS NOT NULL;
