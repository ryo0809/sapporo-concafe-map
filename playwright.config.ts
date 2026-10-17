import { defineConfig } from "@playwright/test";
import path from "node:path";
process.env.PLAYWRIGHT_D1_PATH ??=path.join(process.cwd(),".wrangler/tests",`test-${Date.now()}`);

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "node scripts/test-server.mjs",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout:120000,
    env:{D1_PERSIST_PATH:process.env.PLAYWRIGHT_D1_PATH,ADMIN_USERNAME:"admin",ADMIN_PASSWORD:"admin",SESSION_COOKIE_SECURE:"false"},
  },
});
