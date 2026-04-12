-- Dev seed data — edit freely, applied on `supabase db reset`

-- App config
insert into app_config (notification_email)
values ('briggysmalls90@gmail.com')
on conflict (id) do update set notification_email = excluded.notification_email;

-- Sample bookings (dates are relative-ish, update as needed)
insert into bookings (
  hotel_name, hotel_location, check_in_date, check_out_date,
  room_type, num_guests, current_price, currency,
  cancellation_date, original_booking_source, original_confirmation,
  threshold_percent, timeline_shift_days, status
) values
  (
    'The Ritz London', 'London, UK',
    current_date + interval '60 days', current_date + interval '63 days',
    'Deluxe King, City View', 2, 1200.00, 'GBP',
    current_date + interval '55 days',
    'Booking.com', 'BC-9283746',
    10, 3, 'active'
  ),
  (
    'Hotel Marylebone', 'London, UK',
    current_date + interval '30 days', current_date + interval '32 days',
    'Superior Double Room', 2, 450.00, 'GBP',
    current_date + interval '25 days',
    'Expedia', 'EX-1122334',
    15, 5, 'active'
  ),
  (
    'The Savoy', 'London, UK',
    current_date + interval '14 days', current_date + interval '16 days',
    'Fairmont King Room', 2, 890.00, 'GBP',
    current_date + interval '2 days',
    'Hotels.com', 'HC-5566778',
    5, 3, 'active'
  );
