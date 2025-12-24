-- Add picture_url field to cards for card images
ALTER TABLE cards ADD COLUMN IF NOT EXISTS picture_url TEXT;
