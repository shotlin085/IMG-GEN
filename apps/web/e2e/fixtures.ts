import { expect, type Locator, type Page } from "@playwright/test";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";
export const E2E_USER = { email: "e2e-ui@shotlin.test", name: "E2E Studio", password: "e2e-passphrase-1234" };
export const ADMIN = { email: "admin@shotlin.local", password: process.env.E2E_ADMIN_PASSWORD ?? "shotlin-admin-123" };

/**
 * The studio's `<label>` elements are visual siblings rather than `for=`
 * associations, so accessible-name lookup cannot reach these selects.
 */
export function selectByLabel(scope: Page | Locator, label: string | RegExp): Locator {
  const text = typeof label === "string" ? label : label.source;
  return scope.locator(".select-field, .input-field").filter({ hasText: text }).locator("select, input, textarea").first();
}

async function ensureAccount(user: { email: string; name: string; password: string }) {
  await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  }).catch(() => undefined);
}

async function browserSignIn(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByPlaceholder("you@studio.com").fill(user.email);
  await page.getByPlaceholder("••••••••").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/\/[^/]*\/$/, { timeout: 20_000 });
}

export async function signInAsCustomer(page: Page) {
  await ensureAccount(E2E_USER);
  await browserSignIn(page, E2E_USER);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/garment/i);
}

export async function signInAsAdmin(page: Page) {
  await browserSignIn(page, ADMIN);
}
