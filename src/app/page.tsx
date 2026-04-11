"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Booking } from "@/lib/types";

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        setBookings(data);
        setLoading(false);
      });
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Room Drop</h1>
        <Link
          href="/bookings/new"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Add Booking
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : bookings.length === 0 ? (
        <p className="text-gray-500">
          No active bookings.{" "}
          <Link href="/bookings/new" className="underline">
            Add one
          </Link>{" "}
          to start monitoring prices.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="pb-2 pr-4">Hotel</th>
                <th className="pb-2 pr-4">Dates</th>
                <th className="pb-2 pr-4">Room</th>
                <th className="pb-2 pr-4">Price</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="py-3 pr-4 font-medium">{b.hotel_name}</td>
                  <td className="py-3 pr-4 text-gray-600">
                    {b.check_in_date} → {b.check_out_date}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{b.room_type}</td>
                  <td className="py-3 pr-4">
                    {b.currency} {Number(b.current_price).toFixed(2)}
                  </td>
                  <td className="py-3">
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
