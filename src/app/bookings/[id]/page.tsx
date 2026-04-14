"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Booking, FilterMode, RoomVerdict, ScanStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface ScanResult {
  id: string;
  scanned_at: string;
  scan_status: ScanStatus;
  filter_mode: FilterMode;
  best_price: number | null;
  best_source: string | null;
  best_room_desc: string | null;
  llm_verdict: RoomVerdict | null;
  llm_confidence: number | null;
  savings_amount: number | null;
  savings_percent: number | null;
  alert_triggered: boolean;
}

const SCAN_STATUS_LABELS: Record<ScanStatus, string> = {
  deal_found: "Deal found",
  no_cheaper_rates: "No cheaper rates",
  no_eligible_rates: "No eligible rates",
  no_rates_parsed: "No rates parsed",
  no_property_found: "Property not found",
};

const SCAN_STATUS_COLORS: Record<ScanStatus, string> = {
  deal_found: "text-green-600",
  no_cheaper_rates: "text-muted-foreground",
  no_eligible_rates: "text-yellow-600",
  no_rates_parsed: "text-orange-600",
  no_property_found: "text-red-600",
};

export default function BookingDetail() {
  const params = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/bookings/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking);
        setScans(data.scans);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <p className="p-8 text-muted-foreground">Loading...</p>;
  if (!booking)
    return <p className="p-8 text-muted-foreground">Booking not found.</p>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          &larr; Back to dashboard
        </Link>
        <Button render={<Link href={`/bookings/${params.id}/edit`} />}>
          Edit
        </Button>
      </div>

      <h1 className="mt-4 text-2xl font-bold">{booking.hotel_name}</h1>
      {booking.hotel_location && (
        <p className="text-muted-foreground">{booking.hotel_location}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div>
          <span className="text-muted-foreground">Dates</span>
          <p>
            {booking.check_in_date} → {booking.check_out_date}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Room</span>
          <p>{booking.room_type ?? "Any room"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Price</span>
          <p>
            {booking.currency} {Number(booking.current_price).toFixed(2)}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Status</span>
          <p>
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              {booking.status}
            </span>
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Scan History</h2>

      {scans.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No scans yet.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Best Price</th>
                <th className="pb-2 pr-4">Source</th>
                <th className="pb-2 pr-4">Verdict</th>
                <th className="pb-2 pr-4">Savings</th>
                <th className="pb-2">Alert</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="py-2 pr-4 text-muted-foreground">
                    {new Date(s.scanned_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={SCAN_STATUS_COLORS[s.scan_status]}>
                      {SCAN_STATUS_LABELS[s.scan_status]}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {s.best_price != null
                      ? `£${Number(s.best_price).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {s.best_source ?? "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {s.llm_verdict ? (
                      <span
                        title={`Confidence: ${s.llm_confidence}`}
                        className={
                          s.llm_verdict === "match"
                            ? "text-green-600"
                            : s.llm_verdict === "upgrade"
                              ? "text-blue-600"
                              : "text-orange-600"
                        }
                      >
                        {s.llm_verdict}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {s.savings_percent != null
                      ? `${Number(s.savings_percent).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="py-2">{s.alert_triggered ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
