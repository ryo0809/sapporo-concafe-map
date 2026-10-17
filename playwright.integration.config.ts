import { defineConfig } from "@playwright/test";

export default defineConfig({ testDir: "./tests/integration", workers: 1, timeout: 120000 });
