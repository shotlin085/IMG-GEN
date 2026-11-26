import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const WEB_ORIGIN = process.env.WEB_URL ?? "http://localhost:3100";

export const CUSTOMER = { email: "e2e-ui@shotlin.test", name: "E2E Studio", password: "e2e-passphrase-1234" };
export const ADMIN = { email: "admin@shotlin.local", password: process.env.E2E_ADMIN_PASSWORD ?? "shotlin-admin-123" };

export const AUTH_DIR = resolve(process.cwd(), "e2e/.auth");

async function sessionCookieFor(user: { email: string; password: string }) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  if (res.status !== 201) {
    throw new Error(`E2E login failed for ${user.email}: HTTP ${res.status} ${await res.text().catch(() => "")}`);
  }
  const raw = (res.headers.getSetCookie?.() ?? [])[0];
  if (!raw) throw new Error(`No session cookie returned for ${user.email}`);
  const [pair] = raw.split(";");
  const [name, value] = pair.split("=");
  // Cookies ignore the port, so one cookie authenticates both origins.
  return { name, value, domain: "localhost", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" as const };
}

function writeState(file: string, cookie: unknown) {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify({ cookies: [cookie], origins: [] }, null, 2));
}

/**
 * One login per identity for the whole run: the auth rate limiter is 20
 * attempts / 15 min per IP, which a per-test login would exhaust. The suite
 * reuses the session cookie through Playwright storage state instead, and
 * `login.spec.ts` still exercises the real sign-in form once.
 */
export default async function globalSetup() {
  await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CUSTOMER),
  }).catch(() => undefined);

  writeState(resolve(AUTH_DIR, "customer.json"), await sessionCookieFor(CUSTOMER));
  writeState(resolve(AUTH_DIR, "admin.json"), await sessionCookieFor(ADMIN));
  console.log(`e2e sessions ready for ${WEB_ORIGIN}`);
}
