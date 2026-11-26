import { expect, test } from "@playwright/test";
import { ADMIN } from "./fixtures";

test.describe("admin control room", () => {
  test("renders every section with live data", async ({ page }) => {
    await page.goto("/admin");
    const tabs = page.locator(".tab-pill");
    await expect(tabs).toHaveCount(13, { timeout: 15_000 });

    await tabs.filter({ hasText: "Garment taxonomy" }).click();
    await expect(page.locator(".tax-row").first()).toBeVisible({ timeout: 15_000 });
    expect(await page.locator(".tax-row").count()).toBeGreaterThan(150);

    await tabs.filter({ hasText: "Drapes & wear" }).click();
    await expect(page.locator(".style-row").first()).toBeVisible({ timeout: 15_000 });
    expect(await page.locator(".style-row").count()).toBeGreaterThanOrEqual(30);

    await tabs.filter({ hasText: "Users" }).click();
    await expect(page.getByText(ADMIN.email).first()).toBeVisible({ timeout: 15_000 });

    await tabs.filter({ hasText: "Audit trail" }).click();
    await expect(page.getByText(/Audit trail/i).first()).toBeVisible();
  });
});
