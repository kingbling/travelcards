-- Add cover photo URL to destinations for caching Unsplash photos
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cover_photo_attribution JSONB;
