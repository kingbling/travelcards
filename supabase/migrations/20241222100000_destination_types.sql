-- Add destination type and road trip fields
ALTER TABLE destinations
ADD COLUMN destination_type TEXT DEFAULT 'stay' CHECK (destination_type IN ('stay', 'roadtrip')),
ADD COLUMN start_location TEXT,
ADD COLUMN end_location TEXT,
ADD COLUMN transport_mode TEXT CHECK (transport_mode IN ('car', 'train', 'bus', 'boat', 'plane', 'other'));

-- Waypoints for road trips (stops along the way)
CREATE TABLE waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  day_number INT, -- Which day of the trip
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;

-- RLS policies for waypoints (inherit from journey access)
CREATE POLICY "Users can view waypoints for their journeys" ON waypoints
  FOR SELECT USING (
    destination_id IN (
      SELECT d.id FROM destinations d
      JOIN journeys j ON d.journey_id = j.id
      WHERE j.curator_id = auth.uid() OR j.is_published = true
    )
  );

CREATE POLICY "Users can manage waypoints for their journeys" ON waypoints
  FOR ALL USING (
    destination_id IN (
      SELECT d.id FROM destinations d
      JOIN journeys j ON d.journey_id = j.id
      WHERE j.curator_id = auth.uid()
    )
  );
