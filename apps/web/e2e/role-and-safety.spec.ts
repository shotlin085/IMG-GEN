import { expect, test } from "@playwright/test";
import { API_URL, selectByLabel } from "./fixtures";

test.describe("role separation (customer session)", () => {
  test("a customer cannot reach the control room in the UI or the API", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Operator access/i);
    await expect(page.getByRole("link", { name: /Sign in as admin/ })).toBeVisible();

    // page.request shares the browser cookies; the API runs on its own origin.
    expect((await page.request.get(`${API_URL}/api/admin/users`)).status()).toBe(403);
    expect((await page.request.get(`${API_URL}/api/admin/audit`)).status()).toBe(403);
    expect((await page.request.get(`${API_URL}/api/account`)).status()).toBe(200);
  });

  test("navigation offers the workspace only", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".nav-list").getByRole("link", { name: "Control room" })).toHaveCount(0);
  });
});

test.describe("under-18 mode", () => {
  test("a minor age group surfaces the styling policy and blocks adult poses", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Pro" }).click();

    const age = selectByLabel(page, "Age appearance");
    await expect(async () => {
      expect(await age.locator("option").count()).toBeGreaterThanOrEqual(9);
    }).toPass({ intervals: [500], timeout: 15_000 });

    const values = await age.locator("option").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("value")));
    const minor = values.find((value) => ["toddler", "child", "preteen", "teen"].includes(String(value)));
    expect(minor, "expected a minor age group in the studio vocabulary").toBeTruthy();

    const posePicker = page.locator(".angle-picker").filter({ hasText: "Pose" });
    await age.selectOption(String(minor));
    await expect(page.getByText(/age-appropriate styling policy/i).first()).toBeVisible({ timeout: 10_000 });

    await posePicker.getByRole("button", { name: /Hip pop/ }).click();
    await expect(posePicker.getByRole("alert")).toContainText(/not used for an under-18 appearance/i);

    await posePicker.getByRole("button", { name: /^Standing, relaxed/ }).click();
    await expect(posePicker.getByRole("alert")).toHaveCount(0);
  });
});
