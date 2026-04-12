-- Per-booking preference: does the room type matter?
-- When room_specific = false, all rates are considered regardless of room name.
-- When room_specific = true (default), only rates with known room descriptions
-- are evaluated and room_type must be set.

ALTER TABLE bookings ADD COLUMN room_specific boolean NOT NULL DEFAULT true;

ALTER TABLE bookings ALTER COLUMN room_type DROP NOT NULL;

ALTER TABLE bookings ADD CONSTRAINT room_type_required_when_specific
  CHECK (room_specific = false OR room_type IS NOT NULL);
