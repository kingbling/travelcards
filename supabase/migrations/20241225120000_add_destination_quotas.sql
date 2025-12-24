-- Add per-destination quota overrides
-- When NULL, falls back to journey-level defaults

ALTER TABLE destinations ADD COLUMN reveals_per_week INT DEFAULT NULL;
ALTER TABLE destinations ADD COLUMN treats_per_week INT DEFAULT NULL;

-- Add constraints matching journey table constraints
ALTER TABLE destinations ADD CONSTRAINT destination_reveals_per_week_range
  CHECK (reveals_per_week IS NULL OR (reveals_per_week >= 1 AND reveals_per_week <= 7));

ALTER TABLE destinations ADD CONSTRAINT destination_treats_per_week_range
  CHECK (treats_per_week IS NULL OR (treats_per_week >= 1 AND treats_per_week <= 5));

-- Comments for clarity
COMMENT ON COLUMN destinations.reveals_per_week IS 'Per-destination reveal quota override. NULL = use journey default.';
COMMENT ON COLUMN destinations.treats_per_week IS 'Per-destination treat quota override. NULL = use journey default.';
