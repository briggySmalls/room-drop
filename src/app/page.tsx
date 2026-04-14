"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Booking } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const router = useRouter();
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
        <h1 className="text-2xl font-bold">Your Bookings</h1>
        <Button variant="accent" render={<Link href="/bookings/new" />}>
          Add Booking
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : bookings.length === 0 ? (
        <p className="text-muted-foreground">
          No active bookings.{" "}
          <Link href="/bookings/new" className="text-primary underline">
            Add one
          </Link>{" "}
          to start monitoring prices.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
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
                <tr
                  key={b.id}
                  className="cursor-pointer border-b hover:bg-muted"
                  onClick={() => router.push(`/bookings/${b.id}`)}
                >
                  <td className="py-3 pr-4 font-medium">{b.hotel_name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {b.check_in_date} → {b.check_out_date}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {b.room_type ?? "Any room"}
                  </td>
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
