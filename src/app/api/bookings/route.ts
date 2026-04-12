import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { bookingSchema } from "@/lib/schemas/booking";

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
  const body = await request.json();
  const result = bookingSchema.safeParse(body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => issue.message);
    return NextResponse.json({ errors }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("bookings")
    .insert(result.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
