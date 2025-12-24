-- Add setting for how many cards to show as choices when revealing
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS reveal_card_choices integer DEFAULT 1;

-- Constraint: must be between 1 and 4
ALTER TABLE journeys ADD CONSTRAINT reveal_card_choices_range CHECK (reveal_card_choices >= 1 AND reveal_card_choices <= 4);
