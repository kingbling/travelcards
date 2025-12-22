-- Add location fields to cards for map integration
ALTER TABLE cards ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS location_address TEXT;
