-- Add setting to allow revealing the first card immediately
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS reveal_first_immediately boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN journeys.reveal_first_immediately IS 'When true, the first card can be revealed immediately without waiting for reveal_date';
