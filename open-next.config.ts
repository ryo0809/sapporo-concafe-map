import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Published data is read on each request; this app has no ISR or use-cache data.
export default defineCloudflareConfig();
