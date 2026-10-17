import type { NextConfig } from "next";
import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev({
  // Wrangler CLI appends v3 to --persist-to; getPlatformProxy uses the path directly.
  persist: { path: path.join(process.env.D1_PERSIST_PATH || ".wrangler/state", "v3") },
});

const nextConfig: NextConfig = {
  // Workers does not support Next.js staged Cache Components rendering reliably.
  // Pages read D1 dynamically through connection() and use normal streaming SSR.
  cacheComponents: false,
};

export default nextConfig;
