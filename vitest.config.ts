import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./scripts/test-db-url";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/.claude/**", "**/dist/**", "**/.next/**"],
    globalSetup: ["./scripts/test-setup.ts"],
    env: {
      // Integration tests run against their own DB — never the dev DB (see scripts/test-setup.ts).
      DATABASE_URL: TEST_DATABASE_URL,
      DISABLE_THUMBS: "1", // dockerized ffmpeg per mock asset causes suite-wide contention
    },
  },
});
