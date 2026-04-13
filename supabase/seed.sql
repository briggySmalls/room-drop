-- Dev seed data — edit freely, applied on `supabase db reset`

-- Test user for local development (email: sjbriggs14@gmail.com / password: password)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'authenticated', 'authenticated',
  'sjbriggs14@gmail.com',
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Sam Briggs"}',
  now(), now(),
  '', '', '', '', '', ''
);

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) values (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  jsonb_build_object(
    'sub', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'email', 'sjbriggs14@gmail.com'
  ),
  'email',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  now(), now(), now()
);

-- Sample bookings owned by the test user
insert into bookings (
  user_id, hotel_name, hotel_location, check_in_date, check_out_date,
  room_type, num_guests, current_price, currency,
  cancellation_date, original_booking_source, original_confirmation,
  threshold_percent, non_refundable_window_days, room_specific, status
) values
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'The Ritz London', 'London, UK',
    current_date + interval '60 days', current_date + interval '63 days',
    'Deluxe King, City View', 2, 3100.00, 'GBP',
    current_date + interval '55 days',
    'Booking.com', 'BC-9283746',
    10, 3, true, 'active'
  ),
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'Hotel Marylebone', 'London, UK',
    current_date + interval '30 days', current_date + interval '32 days',
    'Superior Double Room', 2, 450.00, 'GBP',
    current_date + interval '25 days',
    'Expedia', 'EX-1122334',
    15, 5, true, 'active'
  ),
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'The Savoy', 'London, UK',
    current_date + interval '14 days', current_date + interval '16 days',
    null, 2, 1450.00, 'GBP',
    current_date + interval '2 days',
    'Hotels.com', 'HC-5566778',
    5, 3, false, 'active'
  );
