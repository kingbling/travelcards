-- Make treats destination-scoped instead of journey-wide
-- This ensures treats are contextually relevant to the specific country/destination

-- 1. Add destination_id column (nullable first for data migration)
ALTER TABLE treats ADD COLUMN destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE;

-- 2. Create index for destination-based queries
CREATE INDEX idx_treats_destination ON treats(destination_id);
CREATE INDEX idx_treats_destination_revealed ON treats(destination_id, is_revealed);

-- 3. Update RLS policies to work with destination scope
DROP POLICY IF EXISTS "Public read treats of published journeys" ON treats;
DROP POLICY IF EXISTS "Curators manage treats" ON treats;

CREATE POLICY "Public read treats of published journeys" ON treats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journeys j
      INNER JOIN destinations d ON d.journey_id = j.id
      WHERE d.id = treats.destination_id
      AND j.is_published = TRUE
    )
  );

CREATE POLICY "Curators manage treats" ON treats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM journeys j
      INNER JOIN destinations d ON d.journey_id = j.id
      WHERE d.id = treats.destination_id
      AND j.curator_id = auth.uid()
    )
  );

-- 4. After migration, make destination_id NOT NULL
-- Note: Run this after existing data is migrated
-- ALTER TABLE treats ALTER COLUMN destination_id SET NOT NULL;

-- 5. Update treat_reveals to maintain journey_id for quota tracking
-- (keep as-is since quota is still journey-wide)

-- 6. Add comment for clarity
COMMENT ON COLUMN treats.destination_id IS 'Destination this treat belongs to - ensures treats are country-specific';
COMMENT ON COLUMN treats.journey_id IS 'Journey reference for quota tracking - quota is journey-wide but treats are destination-scoped';
