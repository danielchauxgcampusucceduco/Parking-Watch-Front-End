import { defineConfig, devices } from "@playwright/test";

declare const process: { env: Record<string, string | undefined> };

// Pruebas de extremo a extremo (RNF-10.1). En la CI corren contra la URL de vista previa o de
// producción de Vercel (E2E_BASE_URL); en local, contra el servidor de desarrollo.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], viewport: { width: 1366, height: 768 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm dev", url: baseURL, reuseExistingServer: true },
});
