import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getD1(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("D1 binding DBがありません。wrangler.jsoncを確認してください。");
  return env.DB;
}
