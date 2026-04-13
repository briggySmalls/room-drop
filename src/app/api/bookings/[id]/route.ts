import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/schemas/booking";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const result = bookingSchema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => issue.message);
    return NextResponse.json({ errors }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update(result.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
