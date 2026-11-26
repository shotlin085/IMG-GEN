import { expect, test } from "@playwright/test";
import { selectByLabel } from "./fixtures";

const NAV = ["Studio", "Projects", "Garments", "Batch", "Models", "Presets", "Account"];

test.describe("customer studio", () => {
  test("information architecture, live catalogue data and no page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    for (const label of NAV) await expect(page.locator(".nav-list").getByRole("link", { name: label })).toBeVisible();
    await expect(page.locator(".nav-list").getByRole("link", { name: "Control room" })).toHaveCount(0);
    await expect(page.locator(".crumb-status")).toContainText("stack online", { timeout: 15_000 });

    await expect(page.getByRole("tab", { name: "Garment" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pro" })).toHaveAttribute("aria-pressed", "false");

    // Vocabulary is served by the API rather than hard-coded in the studio (P9/P13).
    const age = selectByLabel(page, "Age appearance");
    await expect(async () => {
      expect(await age.locator("option").count()).toBeGreaterThanOrEqual(9);
    }).toPass({ intervals: [500], timeout: 15_000 });
    const frame = selectByLabel(page, "Frame");
    await expect(frame.locator("option")).toHaveCount(6, { timeout: 15_000 });
    // The option labels carry the real ratios and their use case.
    await expect(frame).toContainText(/3:4/, { timeout: 15_000 });
    expect(await frame.innerText()).toMatch(/1:1|9:16|16:9/);

    // Pro controls expose the pose and crop libraries.
    await page.getByRole("button", { name: "Pro" }).click();
    await expect(page.getByRole("button", { name: /Holding the pallu/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Macro detail/ })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    expect(errors, `uncaught page errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("garment intake and library render", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Drop your garment reference/i)).toBeVisible();
    await expect(selectByLabel(page, "Age appearance")).toBeEnabled();

    await page.goto("/garments");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/garment/i);
    await expect(page.locator(".garment-grid, .empty-state").first()).toBeVisible({ timeout: 15_000 });
  });

  test("model library, presets, batch and account render with data", async ({ page }) => {
    await page.goto("/models");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/wears/i);
    await expect(page.locator(".model-card").first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/presets");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/once/i);
    await expect(page.locator(".account-check").first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/batch");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/whole set/i);

    await page.goto("/account");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/account/i);
    await expect(page.getByRole("button", { name: "Sign out of this device" })).toBeVisible();
  });

  test("the catalogue offers garments only — no footwear anywhere", async ({ page }) => {
    await page.goto("/models");
    const models = (await page.locator(".model-card").allInnerTexts()).join(" ");
    await page.goto("/presets");
    const presets = await page.locator("body").innerText();
    expect(`${models} ${presets}`.toLowerCase()).not.toMatch(/footwear|sneaker|sandals|\bheels\b|\bflats\b|loafers|slippers/);
  });
});
