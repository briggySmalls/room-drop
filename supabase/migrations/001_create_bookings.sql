-- Bookings: user's existing hotel reservations
create table bookings (
  id uuid primary key default gen_random_uuid(),
  hotel_name text not null,
  hotel_location text,
  check_in_date date not null,
  check_out_date date not null,
  room_type text not null,
  num_guests integer not null default 2,
  current_price numeric(10,2) not null,
  currency text not null default 'GBP',
  cancellation_date timestamptz not null,
  cancellation_url text,
  original_booking_source text,
  original_confirmation text,
  threshold_percent numeric(5,2),
  threshold_absolute numeric(10,2),
  non_refundable_window_days integer not null default 3,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint check_out_after_check_in check (check_out_date > check_in_date),
  constraint at_least_one_threshold check (
    threshold_percent is not null or threshold_absolute is not null
  )
);

-- App config: single-row configuration
create table app_config (
  id integer primary key default 1 check (id = 1),
  notification_email text not null
);

-- Default config row seeded via supabase/seed.sql
