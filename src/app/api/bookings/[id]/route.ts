import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: scans } = await supabase
    .from("scan_results")
    .select("*")
    .eq("booking_id", id)
    .order("scanned_at", { ascending: false });

  return NextResponse.json({ booking, scans: scans ?? [] });
}
