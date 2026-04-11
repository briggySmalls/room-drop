import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { BookingInsert } from "@/lib/types";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "active")
    .order("check_in_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body: BookingInsert = await request.json();

  const errors: string[] = [];

  if (!body.hotel_name?.trim()) {
    errors.push("Hotel name is required");
  }
  if (!body.check_in_date) {
    errors.push("Check-in date is required");
  }
  if (!body.check_out_date) {
    errors.push("Check-out date is required");
  }
  if (body.check_in_date && body.check_out_date) {
    if (body.check_out_date <= body.check_in_date) {
      errors.push("Check-out date must be after check-in date");
    }
  }
  if (!body.room_type?.trim()) {
    errors.push("Room type is required");
  }
  if (!body.current_price || body.current_price <= 0) {
    errors.push("Price must be a positive number");
  }
  if (!body.cancellation_date) {
    errors.push("Cancellation date is required");
  }
  if (!body.threshold_percent && !body.threshold_absolute) {
    errors.push("At least one deal threshold (% or absolute) is required");
  }

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bookings")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
