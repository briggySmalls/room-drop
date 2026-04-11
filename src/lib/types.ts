export interface Booking {
  id: string;
  hotel_name: string;
  hotel_location: string | null;
  check_in_date: string;
  check_out_date: string;
  room_type: string;
  num_guests: number;
  current_price: number;
  currency: string;
  cancellation_date: string;
  cancellation_url: string | null;
  original_booking_source: string | null;
  original_confirmation: string | null;
  threshold_percent: number | null;
  threshold_absolute: number | null;
  timeline_shift_days: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BookingInsert {
  hotel_name: string;
  hotel_location?: string | null;
  check_in_date: string;
  check_out_date: string;
  room_type: string;
  num_guests?: number;
  current_price: number;
  currency?: string;
  cancellation_date: string;
  cancellation_url?: string | null;
  original_booking_source?: string | null;
  original_confirmation?: string | null;
  threshold_percent?: number | null;
  threshold_absolute?: number | null;
  timeline_shift_days?: number;
}

export interface AppConfig {
  id: number;
  notification_email: string;
}
