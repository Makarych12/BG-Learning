import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "pwa-test",
      resolveId(id) {
        if (id === "virtual:pwa-register") return "\0pwa-test";
      },
      load(id) {
        if (id === "\0pwa-test")
          return "export const registerSW = () => () => Promise.resolve();";
      },
    },
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["node_modules/**", "dist/**"],
  },
});
