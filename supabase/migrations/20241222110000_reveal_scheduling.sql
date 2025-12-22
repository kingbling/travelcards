-- Add reveal scheduling fields to cards
ALTER TABLE cards
ADD COLUMN experience_date DATE, -- When the experience actually happens
ADD COLUMN reveal_date DATE, -- When the card should be revealed to recipient
ADD COLUMN is_admin_preview BOOLEAN DEFAULT true; -- Admin can always see unrevealed cards

-- Add reveal frequency control to journeys
ALTER TABLE journeys
ADD COLUMN reveals_per_week INT DEFAULT 2, -- Max cards that can be revealed per week
ADD COLUMN advance_reveal_days INT DEFAULT 7; -- How many days before experience_date to reveal

-- Add comments for clarity
COMMENT ON COLUMN cards.experience_date IS 'The actual date when the experience/activity happens';
COMMENT ON COLUMN cards.reveal_date IS 'When this card becomes available to reveal for recipient';
COMMENT ON COLUMN journeys.reveals_per_week IS 'Maximum cards that can be revealed per week';
COMMENT ON COLUMN journeys.advance_reveal_days IS 'Days before experience_date that card is revealed';
