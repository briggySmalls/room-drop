create table scan_results (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  scanned_at timestamptz not null default now(),
  scan_status text not null,
  filter_mode text not null,
  raw_response jsonb,
  best_price numeric(10,2),
  best_source text,
  best_room_desc text,
  best_link text,
  is_refundable boolean,
  llm_verdict text,
  llm_confidence numeric(3,2),
  llm_reasoning text,
  savings_amount numeric(10,2),
  savings_percent numeric(5,2),
  alert_triggered boolean not null default false
);
