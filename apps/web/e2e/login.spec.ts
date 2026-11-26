import { expect, test } from "@playwright/test";
import { API_URL } from "./fixtures";

const FRESH = {
  email: `e2e-fresh-${Date.now()}@shotlin.test`,
  name: "E2E Fresh",
  password: "e2e-passphrase-1234",
};

test.describe("sign-in and first run", () => {
  test("the login form authenticates and the tour skip persists server-side", async ({ page }) => {
    const register = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(FRESH),
    });
    expect([201, 409]).toContain(register.status);

    await page.goto("/login");
    await page.getByPlaceholder("you@studio.com").fill(FRESH.email);
    await page.getByPlaceholder("••••••••").fill(FRESH.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/\/[^/]*\/$/, { timeout: 20_000 });

    const tour = page.getByRole("region", { name: "First run tour" });
    await expect(tour).toBeVisible({ timeout: 15_000 });
    await expect(tour.getByRole("listitem")).toHaveCount(3);
    await tour.getByRole("button", { name: "Skip for now" }).click();
    await expect(tour).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("region", { name: "First run tour" })).toHaveCount(0);

    // Skipping is a server-side fact, not a local dismissal.
    const me = await page.request.get(`${API_URL}/api/auth/me`);
    expect((await me.json()).user.onboardedAt).toBeTruthy();
  });

  test("camera capture opens and closes", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "fake media devices are configured for chromium only");
    await page.goto("/");
    const entry = page.getByRole("button", { name: /Capture with camera/ });
    await expect(entry).toBeVisible({ timeout: 15_000 });
    await entry.click();
    const overlay = page.getByRole("dialog", { name: "Capture garment reference" });
    await expect(overlay).toBeVisible();
    await expect(overlay.locator("video")).toBeAttached();
    await overlay.getByRole("button", { name: "Cancel" }).click();
    await expect(overlay).toHaveCount(0);
  });
});
