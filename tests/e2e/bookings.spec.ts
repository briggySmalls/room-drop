import { test, expect } from "@playwright/test";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

async function clearBookings() {
  await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=not.is.null`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
}

async function insertBooking(overrides: Record<string, unknown> = {}) {
  const booking = {
    hotel_name: "The Ritz London",
    hotel_location: "London, UK",
    check_in_date: "2026-06-15",
    check_out_date: "2026-06-18",
    room_type: "Deluxe King, City View",
    num_guests: 2,
    current_price: 1200.0,
    currency: "GBP",
    cancellation_date: "2026-06-10T23:59:00Z",
    original_booking_source: "Booking.com",
    original_confirmation: "BC-9283746",
    threshold_percent: 10,
    status: "active",
    ...overrides,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(booking),
  });

  return res.json();
}

async function getBookings() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

test.beforeEach(async () => {
  await clearBookings();
});

test.afterAll(async () => {
  await clearBookings();
});

test.describe.serial("Booking Ingestion", () => {
  test("successfully create a booking via the form", async ({ page }) => {
    await page.goto("/bookings/new");

    // Step 1: Your Booking
    await page.getByLabel("Hotel Name").fill("The Ritz London");
    await page.getByLabel("Location").fill("London, UK");
    await page.getByLabel("Check-in Date").fill("2026-06-15");
    await page.getByLabel("Check-out Date").fill("2026-06-18");
    await page.getByLabel("Room Type").fill("Deluxe King, City View");
    await page.getByLabel("Number of Guests").fill("2");
    await page.getByLabel("Total Price").fill("1200.00");
    await page.getByLabel("Free Cancellation Date").fill("2026-06-10");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2: Booking Reference
    await page.getByLabel("Booking Source").fill("Booking.com");
    await page.getByLabel("Confirmation Number").fill("BC-9283746");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 3: Alert Settings — defaults (10%, 3 days)
    await page.getByRole("button", { name: "Add Booking" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("The Ritz London")).toBeVisible();

    const bookings = await getBookings();
    expect(bookings).toHaveLength(1);
    expect(bookings[0].status).toBe("active");
  });

  test("currency combobox filters and selects a currency", async ({ page }) => {
    await page.goto("/bookings/new");

    // Step 1: fill required fields
    await page.getByLabel("Hotel Name").fill("Currency Test Hotel");
    await page.getByLabel("Check-in Date").fill("2026-06-15");
    await page.getByLabel("Check-out Date").fill("2026-06-18");
    await page.getByLabel("Room Type").fill("Standard");
    await page.getByLabel("Total Price").fill("500");
    await page.getByLabel("Free Cancellation Date").fill("2026-06-10");

    // Open the currency combobox and type to filter
    const comboboxInput = page.getByPlaceholder("Search currencies...");
    await comboboxInput.click();
    await comboboxInput.fill("US");

    // Select USD from the dropdown
    await page.getByRole("option", { name: /USD/ }).click();

    // Continue through the wizard and submit
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Add Booking" }).click();
    await expect(page).toHaveURL("/");

    const bookings = await getBookings();
    const created = bookings.find(
      (b: { hotel_name: string }) => b.hotel_name === "Currency Test Hotel",
    );
    expect(created).toBeDefined();
    expect(created.currency).toBe("USD");
  });

  test("booking requires at least one deal threshold", async ({ page }) => {
    await page.goto("/bookings/new");

    // Step 1: fill required fields
    await page.getByLabel("Hotel Name").fill("Test Hotel");
    await page.getByLabel("Check-in Date").fill("2026-06-15");
    await page.getByLabel("Check-out Date").fill("2026-06-18");
    await page.getByLabel("Room Type").fill("Standard");
    await page.getByLabel("Total Price").fill("500");
    await page.getByLabel("Free Cancellation Date").fill("2026-06-10");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2: skip
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 3: switch to Absolute tab to clear default 10% threshold
    await page.getByRole("tab", { name: "Absolute" }).click();
    // Both thresholds are now null
    await page.getByRole("button", { name: "Add Booking" }).click();

    await expect(page.getByText("At least one deal threshold")).toBeVisible();
  });

  test("check-out date must be after check-in date", async ({ page }) => {
    await page.goto("/bookings/new");

    await page.getByLabel("Hotel Name").fill("Test Hotel");
    await page.getByLabel("Check-in Date").fill("2026-06-18");
    await page.getByLabel("Check-out Date").fill("2026-06-15");
    await page.getByLabel("Room Type").fill("Standard");
    await page.getByLabel("Total Price").fill("500");
    await page.getByLabel("Free Cancellation Date").fill("2026-06-10");

    // Click Next — should stay on Step 1 with error
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(
      page.getByText("Check-out date must be after check-in date"),
    ).toBeVisible();
  });

  test("non-refundable window field defaults to 3 and is submitted", async ({
    page,
  }) => {
    await page.goto("/bookings/new");

    // Step 1
    await page.getByLabel("Hotel Name").fill("Timeline Test Hotel");
    await page.getByLabel("Check-in Date").fill("2026-07-01");
    await page.getByLabel("Check-out Date").fill("2026-07-03");
    await page.getByLabel("Room Type").fill("Standard");
    await page.getByLabel("Total Price").fill("500");
    await page.getByLabel("Free Cancellation Date").fill("2026-06-28");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2: skip
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 3: check NR window default, then modify
    const field = page.getByLabel("Non-refundable window");
    await expect(field).toBeVisible();
    await expect(field).toHaveValue("3");
    await field.clear();
    await field.fill("5");

    await page.getByRole("button", { name: "Add Booking" }).click();
    await expect(page).toHaveURL("/");

    const bookings = await getBookings();
    const created = bookings.find(
      (b: { hotel_name: string }) => b.hotel_name === "Timeline Test Hotel",
    );
    expect(created).toBeDefined();
    expect(created.non_refundable_window_days).toBe(5);
  });

  test("dashboard lists only active bookings", async ({ page }) => {
    await insertBooking({ hotel_name: "The Ritz London", status: "active" });
    await insertBooking({ hotel_name: "Hotel Marylebone", status: "expired" });

    await page.goto("/");

    await expect(page.getByText("The Ritz London")).toBeVisible();
    await expect(page.getByText("Hotel Marylebone")).not.toBeVisible();
  });
});
