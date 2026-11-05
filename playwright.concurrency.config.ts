// Manual, opt-in API concurrency test; never used by push-triggered CI.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "inventory-concurrency.manual.ts",
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: "list",
});
