-- Add coordinate and Google Places fields to cards for precise mapping
ALTER TABLE cards ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS google_place_id TEXT;
