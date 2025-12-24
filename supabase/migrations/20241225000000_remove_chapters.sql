-- Remove chapter system (unused alternative reveal mechanism)
-- This migration removes the chapter-based reveal flow in favor of the destination-based flow

-- Remove chapter_id from cards table
ALTER TABLE cards DROP COLUMN IF EXISTS chapter_id;

-- Remove chapter_id from love_letters table
ALTER TABLE love_letters DROP COLUMN IF EXISTS chapter_id;

-- Drop chapters table (CASCADE will remove indexes and RLS policies)
DROP TABLE IF EXISTS chapters CASCADE;
