-- Add user ownership to bookings
ALTER TABLE bookings ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();

-- Enable Row Level Security on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Bookings: authenticated users can CRUD their own rows
CREATE POLICY "Users can select own bookings"
  ON bookings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  USING (user_id = auth.uid());

-- Scan results: users can view results for their own bookings
-- (inserted by cron via admin client only)
CREATE POLICY "Users can view own scan results"
  ON scan_results FOR SELECT
  USING (booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()));

-- Alerts sent: users can view alerts for their own bookings
-- (inserted by cron via admin client only)
CREATE POLICY "Users can view own alerts"
  ON alerts_sent FOR SELECT
  USING (booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()));

-- App config: deny all user access (admin client bypasses RLS)
CREATE POLICY "Service role only"
  ON app_config FOR ALL
  USING (false);
