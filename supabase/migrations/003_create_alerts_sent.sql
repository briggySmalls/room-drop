create table alerts_sent (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  scan_result_id uuid not null references scan_results(id),
  sent_at timestamptz not null default now(),
  recipient_email text not null,
  source text not null,
  savings_amount numeric(10,2) not null,
  savings_percent numeric(5,2) not null,
  resend_id text
);
