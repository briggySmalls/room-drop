import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { env } from "@/lib/env";
import { searchHotelPrices } from "@/lib/scraper";
import { compareRooms } from "@/lib/llm";
import { Booking } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (env.cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getSupabase();

  // Fetch active bookings with future cancellation dates
  const { data: bookings, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "active")
    .gt("cancellation_date", new Date().toISOString());

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const results = [];

  for (const booking of (bookings ?? []) as Booking[]) {
    try {
      const result = await processBooking(supabase, booking);
      results.push(result);
    } catch (err) {
      console.error(`Error processing booking ${booking.id}:`, err);
      results.push({ booking_id: booking.id, error: String(err) });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}

async function processBooking(
  supabase: ReturnType<typeof getSupabase>,
  booking: Booking,
) {
  const daysUntilCancellation = Math.ceil(
    (new Date(booking.cancellation_date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );

  const filterMode =
    daysUntilCancellation <= booking.timeline_shift_days
      ? "all_rates"
      : "refundable_only";

  const { rates, raw } = await searchHotelPrices(
    booking.hotel_name,
    booking.hotel_location,
    booking.check_in_date,
    booking.check_out_date,
    booking.num_guests,
  );

  // Filter rates by refundable status
  const eligibleRates =
    filterMode === "refundable_only"
      ? rates.filter((r) => r.free_cancellation)
      : rates;

  // Find cheaper rates
  const cheaperRates = eligibleRates.filter(
    (r) => r.price < Number(booking.current_price),
  );

  if (cheaperRates.length === 0) {
    // No cheaper rates — store scan result with no deal
    const { data: scanResult } = await supabase
      .from("scan_results")
      .insert({
        booking_id: booking.id,
        filter_mode: filterMode,
        raw_response: raw,
        best_price: null,
        best_source: null,
        best_room_desc: null,
        best_link: null,
        is_refundable: null,
        llm_verdict: null,
        llm_confidence: null,
        llm_reasoning: null,
        savings_amount: null,
        savings_percent: null,
        alert_triggered: false,
      })
      .select()
      .single();

    return {
      booking_id: booking.id,
      deal_found: false,
      scan_result_id: scanResult?.id,
    };
  }

  // Evaluate the cheapest rate with LLM
  const bestRate = cheaperRates.reduce((a, b) => (a.price < b.price ? a : b));

  const comparison = await compareRooms(
    booking.room_type,
    bestRate.room_description,
    booking.hotel_name,
  );

  const savingsAmount = Number(booking.current_price) - bestRate.price;
  const savingsPercent = (savingsAmount / Number(booking.current_price)) * 100;

  // Determine if alert should trigger
  const alertTriggered = shouldAlert(
    booking,
    comparison.verdict,
    savingsAmount,
    savingsPercent,
  );

  const { data: scanResult } = await supabase
    .from("scan_results")
    .insert({
      booking_id: booking.id,
      filter_mode: filterMode,
      raw_response: raw,
      best_price: bestRate.price,
      best_source: bestRate.source,
      best_room_desc: bestRate.room_description,
      best_link: bestRate.link,
      is_refundable: bestRate.free_cancellation,
      llm_verdict: comparison.verdict,
      llm_confidence: comparison.confidence,
      llm_reasoning: comparison.reasoning,
      savings_amount: savingsAmount,
      savings_percent: Math.round(savingsPercent * 100) / 100,
      alert_triggered: alertTriggered,
    })
    .select()
    .single();

  return {
    booking_id: booking.id,
    deal_found: true,
    alert_triggered: alertTriggered,
    scan_result_id: scanResult?.id,
  };
}

function shouldAlert(
  booking: Booking,
  verdict: string,
  savingsAmount: number,
  savingsPercent: number,
): boolean {
  // Only match or upgrade verdicts trigger alerts (downgrade support in commit 6)
  if (verdict !== "match" && verdict !== "upgrade") {
    return false;
  }

  const meetsPercent =
    booking.threshold_percent != null &&
    savingsPercent >= Number(booking.threshold_percent);

  const meetsAbsolute =
    booking.threshold_absolute != null &&
    savingsAmount >= Number(booking.threshold_absolute);

  return meetsPercent || meetsAbsolute;
}
