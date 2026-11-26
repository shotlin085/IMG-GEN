import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite for the Shotlin studio (master plan Phase 16 "production testing").
 *
 * Prerequisites (all local, mock providers — no AI credits are spent):
 *   docker start shotlin-redis                     # or the throwaway containers from CODEBASE_LOG §26/§29
 *   node apps/api/dist/main.js                     # API on :4000
 *   node apps/web/…/next start -p 3100            # built app on :3100
 * Set API_URL / WEB_URL to override the defaults.
 */
import { resolve } from "node:path";

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3100";
const AUTH = (who: string) => resolve(__dirname, "e2e/.auth", `${who}.json`);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "./e2e/.artifacts",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "on",
    video: "off",
    launchOptions: {
      // Lets the camera-capture test reach a real getUserMedia stream without a physical device.
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    },
  },
  projects: [
    // The sign-in form itself, starting from a clean context.
    { name: "login", testMatch: /login\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: { cookies: [], origins: [] } } },
    // Everything else reuses one session per identity (the auth limiter is 20/15min/IP).
    { name: "customer-desktop", testMatch: /studio|role-and-safety/ , use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: AUTH("customer") } },
    { name: "customer-phone", testMatch: /studio|role-and-safety/, use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, storageState: AUTH("customer") } },
    { name: "customer-tablet", testMatch: /studio|role-and-safety/, use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 }, storageState: AUTH("customer") } },
    { name: "admin-desktop", testMatch: /admin/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: AUTH("admin") } },
  ],
});
