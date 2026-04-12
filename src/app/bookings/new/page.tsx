"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { bookingSchema, type BookingFormValues } from "@/lib/schemas/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";

const toNumber = (v: string) => (v === "" ? undefined : Number(v));
const toNullableNumber = (v: string) => (v === "" ? null : Number(v));

export default function NewBooking() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      currency: "GBP",
      num_guests: 2,
      non_refundable_window_days: 3,
    },
  });

  async function onSubmit(data: BookingFormValues) {
    setServerError(null);

    const body = {
      ...data,
      hotel_location: data.hotel_location || null,
      cancellation_url: data.cancellation_url || null,
      original_booking_source: data.original_booking_source || null,
      original_confirmation: data.original_confirmation || null,
      cancellation_date: `${data.cancellation_date}T23:59:00Z`,
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const responseData = await res.json();
      setServerError(
        responseData.errors?.join(", ") ||
          responseData.error ||
          "Something went wrong",
      );
      return;
    }

    router.push("/");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Add Booking</h1>

      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field data-invalid={errors.hotel_name ? true : undefined}>
          <FieldLabel htmlFor="hotel_name">Hotel Name</FieldLabel>
          <Input id="hotel_name" {...register("hotel_name")} />
          {errors.hotel_name && (
            <FieldError>{errors.hotel_name.message}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="hotel_location">Location</FieldLabel>
          <Input id="hotel_location" {...register("hotel_location")} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={errors.check_in_date ? true : undefined}>
            <FieldLabel htmlFor="check_in_date">Check-in Date</FieldLabel>
            <Input
              id="check_in_date"
              type="date"
              {...register("check_in_date")}
            />
            {errors.check_in_date && (
              <FieldError>{errors.check_in_date.message}</FieldError>
            )}
          </Field>
          <Field data-invalid={errors.check_out_date ? true : undefined}>
            <FieldLabel htmlFor="check_out_date">Check-out Date</FieldLabel>
            <Input
              id="check_out_date"
              type="date"
              {...register("check_out_date")}
            />
            {errors.check_out_date && (
              <FieldError>{errors.check_out_date.message}</FieldError>
            )}
          </Field>
        </div>

        <Field data-invalid={errors.room_type ? true : undefined}>
          <FieldLabel htmlFor="room_type">Room Type</FieldLabel>
          <Input id="room_type" {...register("room_type")} />
          {errors.room_type && (
            <FieldError>{errors.room_type.message}</FieldError>
          )}
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field data-invalid={errors.num_guests ? true : undefined}>
            <FieldLabel htmlFor="num_guests">Number of Guests</FieldLabel>
            <Input
              id="num_guests"
              type="number"
              {...register("num_guests", { setValueAs: toNumber })}
            />
            {errors.num_guests && (
              <FieldError>{errors.num_guests.message}</FieldError>
            )}
          </Field>
          <Field data-invalid={errors.current_price ? true : undefined}>
            <FieldLabel htmlFor="current_price">Total Price</FieldLabel>
            <Input
              id="current_price"
              type="number"
              step="0.01"
              {...register("current_price", { setValueAs: toNumber })}
            />
            {errors.current_price && (
              <FieldError>{errors.current_price.message}</FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <Input id="currency" {...register("currency")} />
          </Field>
        </div>

        <Field data-invalid={errors.cancellation_date ? true : undefined}>
          <FieldLabel htmlFor="cancellation_date">
            Free Cancellation Date
          </FieldLabel>
          <Input
            id="cancellation_date"
            type="date"
            {...register("cancellation_date")}
          />
          {errors.cancellation_date && (
            <FieldError>{errors.cancellation_date.message}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="cancellation_url">Cancellation URL</FieldLabel>
          <Input
            id="cancellation_url"
            type="url"
            {...register("cancellation_url")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="original_booking_source">
            Booking Source
          </FieldLabel>
          <Input
            id="original_booking_source"
            {...register("original_booking_source")}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="original_confirmation">
            Confirmation Number
          </FieldLabel>
          <Input
            id="original_confirmation"
            {...register("original_confirmation")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={errors.threshold_percent ? true : undefined}>
            <FieldLabel htmlFor="threshold_percent">
              Min Price Drop %
            </FieldLabel>
            <Input
              id="threshold_percent"
              type="number"
              step="0.01"
              {...register("threshold_percent", {
                setValueAs: toNullableNumber,
              })}
            />
            {errors.threshold_percent && (
              <FieldError>{errors.threshold_percent.message}</FieldError>
            )}
          </Field>
          <Field data-invalid={errors.threshold_absolute ? true : undefined}>
            <FieldLabel htmlFor="threshold_absolute">
              Min Price Drop (absolute)
            </FieldLabel>
            <Input
              id="threshold_absolute"
              type="number"
              step="0.01"
              {...register("threshold_absolute", {
                setValueAs: toNullableNumber,
              })}
            />
            {errors.threshold_absolute && (
              <FieldError>{errors.threshold_absolute.message}</FieldError>
            )}
          </Field>
        </div>

        <Field
          data-invalid={errors.non_refundable_window_days ? true : undefined}
        >
          <FieldLabel htmlFor="non_refundable_window_days">
            Non-refundable window
          </FieldLabel>
          <Input
            id="non_refundable_window_days"
            type="number"
            {...register("non_refundable_window_days", {
              setValueAs: toNumber,
            })}
          />
          <FieldDescription>
            Include non-refundable rates this many days before your cancellation
            deadline
          </FieldDescription>
          {errors.non_refundable_window_days && (
            <FieldError>{errors.non_refundable_window_days.message}</FieldError>
          )}
        </Field>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Saving..." : "Add Booking"}
        </Button>
      </form>
    </main>
  );
}
