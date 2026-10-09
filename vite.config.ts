/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Sitio estático para Vercel (SPA). Las URLs del backend llegan por VITE_API_URL y VITE_WS_URL.
export default defineConfig({
  plugins: [react()],
  build: { sourcemap: false },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/api/schema.d.ts", "src/test/**", "src/**/*.test.{ts,tsx}"],
      // RNF-10.1: cobertura mínima del Frontend.
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 65 },
    },
  },
});
