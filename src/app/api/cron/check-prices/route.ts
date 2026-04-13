import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { searchHotelPrices } from "@/lib/scraper";
import { compareRooms } from "@/lib/llm";
import { sendEmail } from "@/lib/email";
import { buildDealFoundEmail } from "@/emails/deal-found";
import { Booking, FilterMode, RoomVerdict, ScanStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (env.cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  // Expire bookings past their cancellation date
  const { data: expired } = await supabase
    .from("bookings")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("cancellation_date", new Date().toISOString())
    .select("id");

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
    expired: expired?.length ?? 0,
    processed: results.length,
    results,
  });
}

async function processBooking(
  supabase: ReturnType<typeof createAdminClient>,
  booking: Booking,
) {
  const daysUntilCancellation = Math.ceil(
    (new Date(booking.cancellation_date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );

  const filterMode: FilterMode =
    daysUntilCancellation <= booking.non_refundable_window_days
      ? "all_rates"
      : "refundable_only";

  const { rates, raw, propertyFound } = await searchHotelPrices(
    booking.hotel_name,
    booking.hotel_location,
    booking.check_in_date,
    booking.check_out_date,
    booking.num_guests,
  );

  // Filter rates by refundable status
  let eligibleRates =
    filterMode === "refundable_only"
      ? rates.filter((r) => r.free_cancellation)
      : rates;

  // When room type matters, exclude rates without a known room description
  if (booking.room_specific) {
    eligibleRates = eligibleRates.filter(
      (r) => r.room_description !== "Unknown room",
    );
  }

  // Find cheaper rates
  const cheaperRates = eligibleRates.filter(
    (r) => r.price < Number(booking.current_price),
  );

  if (cheaperRates.length === 0) {
    const scanStatus: ScanStatus = !propertyFound
      ? "no_property_found"
      : rates.length === 0
        ? "no_rates_parsed"
        : eligibleRates.length === 0
          ? "no_eligible_rates"
          : "no_cheaper_rates";

    // For no_cheaper_rates, still record the best available rate for context
    const bestAvailable =
      scanStatus === "no_cheaper_rates"
        ? eligibleRates.reduce((a, b) => (a.price < b.price ? a : b))
        : null;

    const { data: scanResult } = await supabase
      .from("scan_results")
      .insert({
        booking_id: booking.id,
        scan_status: scanStatus,
        filter_mode: filterMode,
        raw_response: raw,
        best_price: bestAvailable?.price ?? null,
        best_source: bestAvailable?.source ?? null,
        best_room_desc: bestAvailable?.room_description ?? null,
        best_link: bestAvailable?.link ?? null,
        is_refundable: bestAvailable?.free_cancellation ?? null,
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
      scan_status: scanStatus,
      scan_result_id: scanResult?.id,
    };
  }

  // Evaluate the cheapest rate with LLM
  const bestRate = cheaperRates.reduce((a, b) => (a.price < b.price ? a : b));

  const comparison = booking.room_specific
    ? await compareRooms(
        booking.room_type!,
        bestRate.room_description,
        booking.hotel_name,
      )
    : {
        verdict: "match" as const,
        confidence: 1.0,
        reasoning: "Room comparison skipped — any room accepted",
      };

  const savingsAmount = Number(booking.current_price) - bestRate.price;
  const savingsPercent = (savingsAmount / Number(booking.current_price)) * 100;

  // Determine if alert should trigger
  const alertTriggered = shouldAlert(
    booking,
    comparison.verdict,
    savingsAmount,
    savingsPercent,
  );

  // Check for dedup: same booking + source within 24 hours
  let emailSent = false;
  if (alertTriggered) {
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: recentAlerts } = await supabase
      .from("alerts_sent")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("source", bestRate.source)
      .gte("sent_at", twentyFourHoursAgo);

    if (!recentAlerts || recentAlerts.length === 0) {
      emailSent = true;
    }
  }

  // Determine final alert_triggered (must pass both threshold and dedup)
  const finalAlertTriggered = alertTriggered && emailSent;

  const { data: scanResult } = await supabase
    .from("scan_results")
    .insert({
      booking_id: booking.id,
      scan_status: "deal_found",
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
      alert_triggered: finalAlertTriggered,
    })
    .select()
    .single();

  if (finalAlertTriggered && scanResult) {
    await sendAlertEmail(supabase, booking, scanResult, bestRate, comparison, {
      savingsAmount,
      savingsPercent: Math.round(savingsPercent * 100) / 100,
    });
  }

  return {
    booking_id: booking.id,
    deal_found: true,
    alert_triggered: finalAlertTriggered,
    scan_result_id: scanResult?.id,
  };
}

async function sendAlertEmail(
  supabase: ReturnType<typeof createAdminClient>,
  booking: Booking,
  scanResult: { id: string },
  bestRate: {
    price: number;
    source: string;
    room_description: string;
    link: string | null;
    free_cancellation: boolean;
  },
  comparison: { reasoning: string },
  savings: { savingsAmount: number; savingsPercent: number },
) {
  const { data: config } = await supabase
    .from("app_config")
    .select("notification_email")
    .single();

  if (!config?.notification_email) {
    console.error("No notification email configured in app_config");
    return;
  }

  const { subject, html } = buildDealFoundEmail({
    hotelName: booking.hotel_name,
    checkIn: booking.check_in_date,
    checkOut: booking.check_out_date,
    originalPrice: Number(booking.current_price),
    newPrice: bestRate.price,
    currency: booking.currency,
    savingsAmount: savings.savingsAmount,
    savingsPercent: savings.savingsPercent,
    source: bestRate.source,
    roomDescription: bestRate.room_description,
    bookingLink: bestRate.link,
    llmReasoning: comparison.reasoning,
    cancellationDate: booking.cancellation_date,
    cancellationUrl: booking.cancellation_url,
    originalBookingSource: booking.original_booking_source,
    isRefundable: bestRate.free_cancellation,
  });

  const { id: resendId } = await sendEmail({
    to: config.notification_email,
    subject,
    html,
  });

  await supabase.from("alerts_sent").insert({
    booking_id: booking.id,
    scan_result_id: scanResult.id,
    recipient_email: config.notification_email,
    source: bestRate.source,
    savings_amount: savings.savingsAmount,
    savings_percent: savings.savingsPercent,
    resend_id: resendId,
  });
}

function shouldAlert(
  booking: Booking,
  verdict: RoomVerdict,
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
