import { z } from "zod";

export const bookingFields = z.object({
  hotel_name: z.string().trim().min(1, "Hotel name is required"),
  hotel_location: z.string().nullable().optional(),
  check_in_date: z.string().min(1, "Check-in date is required"),
  check_out_date: z.string().min(1, "Check-out date is required"),
  room_type: z.string().trim().min(1, "Room type is required"),
  num_guests: z.number().int().positive().optional().default(2),
  current_price: z.number().positive("Price must be a positive number"),
  currency: z.string().optional().default("GBP"),
  cancellation_date: z.string().min(1, "Cancellation date is required"),
  cancellation_url: z.string().nullable().optional(),
  original_booking_source: z.string().nullable().optional(),
  original_confirmation: z.string().nullable().optional(),
  threshold_percent: z.number().nullable().optional(),
  threshold_absolute: z.number().nullable().optional(),
  non_refundable_window_days: z.number().int().positive().optional().default(3),
});

export const bookingSchema = bookingFields
  .refine((data) => data.check_out_date > data.check_in_date, {
    message: "Check-out date must be after check-in date",
    path: ["check_out_date"],
  })
  .refine((data) => data.threshold_percent || data.threshold_absolute, {
    message: "At least one deal threshold (% or absolute) is required",
    path: ["threshold_percent"],
  });

export type BookingFormValues = z.infer<typeof bookingFields>;
