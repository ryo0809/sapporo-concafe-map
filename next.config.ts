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
  poweredByHeader: false,
  async redirects(){return [{source:"/:path*",has:[{type:"host" as const,value:"www.sapporo-concafe-map.com"}],destination:"https://sapporo-concafe-map.com/:path*",permanent:true}];},
  async headers(){
    const security=[
      {key:"X-Content-Type-Options",value:"nosniff"},
      {key:"X-Frame-Options",value:"DENY"},
      {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
      {key:"Content-Security-Policy",value:"frame-ancestors 'none'; object-src 'none'; base-uri 'self'"},
    ];
    const privateHeaders=[{key:"Cache-Control",value:"private, no-store, max-age=0"},{key:"X-Robots-Tag",value:"noindex, nofollow"}];
    if(process.env.SITE_INDEXABLE==="true")security.push({key:"Strict-Transport-Security",value:"max-age=31536000"});
    return [
      {source:"/:path*",headers:security},
      {source:"/admin/:path*",headers:privateHeaders},
      {source:"/api/:path*",headers:privateHeaders},
    ];
  },
};

export default nextConfig;
