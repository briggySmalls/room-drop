import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const TEST_EMAIL = "test@roomdrop.local";
const TEST_PASSWORD = "test-password-123";
const AUTH_DIR = path.join(__dirname, ".auth");
const AUTH_FILE = path.join(AUTH_DIR, "user.json");
const TEST_USER_FILE = path.join(AUTH_DIR, "test-user.json");

setup("authenticate", async ({ page }) => {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Clean up existing test user if present
  const { data: users } = await admin.auth.admin.listUsers();
  const existing = users?.users.find((u) => u.email === TEST_EMAIL);
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id);
  }

  // Create test user
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

  if (createError || !created.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`);
  }

  // Write test user ID for test helpers
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(
    TEST_USER_FILE,
    JSON.stringify({ id: created.user.id, email: TEST_EMAIL }),
  );

  // Sign in via the login page to set proper session cookies
  await page.goto("/auth/login");
  await page.fill("#email", TEST_EMAIL);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/");

  // Save authenticated browser state
  await page.context().storageState({ path: AUTH_FILE });
});
