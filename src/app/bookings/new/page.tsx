"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewBooking() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);

    const thresholdPercent = form.get("threshold_percent") as string;
    const thresholdAbsolute = form.get("threshold_absolute") as string;

    if (!thresholdPercent && !thresholdAbsolute) {
      setError("At least one deal threshold (% or absolute) is required");
      setSubmitting(false);
      return;
    }

    const checkIn = form.get("check_in_date") as string;
    const checkOut = form.get("check_out_date") as string;
    if (checkOut <= checkIn) {
      setError("Check-out date must be after check-in date");
      setSubmitting(false);
      return;
    }

    const body = {
      hotel_name: form.get("hotel_name") as string,
      hotel_location: (form.get("hotel_location") as string) || null,
      check_in_date: checkIn,
      check_out_date: checkOut,
      room_type: form.get("room_type") as string,
      num_guests: Number(form.get("num_guests")) || 2,
      current_price: Number(form.get("current_price")),
      currency: (form.get("currency") as string) || "GBP",
      cancellation_date: `${form.get("cancellation_date")}T23:59:00Z`,
      cancellation_url: (form.get("cancellation_url") as string) || null,
      original_booking_source:
        (form.get("original_booking_source") as string) || null,
      original_confirmation:
        (form.get("original_confirmation") as string) || null,
      threshold_percent: thresholdPercent ? Number(thresholdPercent) : null,
      threshold_absolute: thresholdAbsolute ? Number(thresholdAbsolute) : null,
      non_refundable_window_days:
        Number(form.get("non_refundable_window_days")) || undefined,
    };

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.errors?.join(", ") || data.error || "Something went wrong");
      setSubmitting(false);
      return;
    }

    router.push("/");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Add Booking</h1>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Hotel Name" name="hotel_name" required />
        <Field label="Location" name="hotel_location" />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Check-in Date"
            name="check_in_date"
            type="date"
            required
          />
          <Field
            label="Check-out Date"
            name="check_out_date"
            type="date"
            required
          />
        </div>

        <Field label="Room Type" name="room_type" required />

        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Number of Guests"
            name="num_guests"
            type="number"
            defaultValue="2"
          />
          <Field
            label="Total Price"
            name="current_price"
            type="number"
            step="0.01"
            required
          />
          <Field label="Currency" name="currency" defaultValue="GBP" />
        </div>

        <Field
          label="Free Cancellation Date"
          name="cancellation_date"
          type="date"
          required
        />
        <Field label="Cancellation URL" name="cancellation_url" type="url" />
        <Field label="Booking Source" name="original_booking_source" />
        <Field label="Confirmation Number" name="original_confirmation" />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Min Price Drop %"
            name="threshold_percent"
            type="number"
            step="0.01"
          />
          <Field
            label="Min Price Drop (absolute)"
            name="threshold_absolute"
            type="number"
            step="0.01"
          />
        </div>

        <Field
          label="Non-refundable window"
          name="non_refundable_window_days"
          type="number"
          defaultValue="3"
          hint="Include non-refundable rates this many days before your cancellation deadline"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-black px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Add Booking"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  step,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={step}
        className="w-full rounded border px-3 py-2 text-sm"
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
