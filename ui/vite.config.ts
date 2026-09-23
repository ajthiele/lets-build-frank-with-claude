/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frank serves this build at / and the console calls /mcp relatively (ADR-006),
// so there is no VITE_FRANK_URL. In dev, Vite forwards /mcp to a local Frank.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/mcp": "http://localhost:3000",
      "/healthz": "http://localhost:3000",
    },
  },
  build: {
    // Cloudscape is large and this is an internal console, not a public site.
    chunkSizeWarningLimit: 3000,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
  },
});
