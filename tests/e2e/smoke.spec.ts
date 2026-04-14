import { test, expect } from "@playwright/test";

test("application renders the home page", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your Bookings" }),
  ).toBeVisible();
});
