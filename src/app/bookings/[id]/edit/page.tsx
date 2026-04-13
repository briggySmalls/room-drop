"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Booking } from "@/lib/types";
import { BookingForm } from "@/components/booking-form";

export default function EditBooking() {
  const params = useParams();
  const id = params.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/bookings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <p className="p-8 text-gray-500">Loading...</p>;
  if (!booking) return <p className="p-8 text-gray-500">Booking not found.</p>;

  return <BookingForm mode="edit" initialData={booking} bookingId={id} />;
}
