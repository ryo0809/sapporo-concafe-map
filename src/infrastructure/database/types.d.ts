// Import D1 types as module types so Workers globals do not replace browser DOM types.
declare global {
  type D1Database = import("@cloudflare/workers-types").D1Database;
  type D1PreparedStatement = import("@cloudflare/workers-types").D1PreparedStatement;
  type Fetcher = import("@cloudflare/workers-types").Fetcher;
  interface CloudflareEnv { DB: D1Database; }
}
export {};
