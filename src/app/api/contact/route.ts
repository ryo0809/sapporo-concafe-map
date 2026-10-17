import { getD1 } from "@/infrastructure/database/d1";
import { checkOrigin, AccessError } from "@/infrastructure/admin/http-session";
import { validateContact } from "@/domain/contact";

const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!request.headers.get("content-type")?.includes("application/json")) throw new AccessError(415, "JSONで送信してください。");
    const reader = request.body?.getReader();
    if (!reader) throw new AccessError(400, "入力内容を確認してください。");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > 32768) { await reader.cancel(); throw new AccessError(413, "送信データが大きすぎます。"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let input;
    try { input = validateContact(JSON.parse(new TextDecoder().decode(bytes))); }
    catch (error) { throw new AccessError(400, error instanceof SyntaxError ? "入力内容を確認してください。" : (error as Error).message); }
    if (input.website) return Response.json({ ok: true }, { headers });
    const db = await getD1(), now = Date.now();
    // Trust only Cloudflare's client header; local development shares one bucket.
    const identity = `${Math.floor(now / 86400000)}:${request.headers.get("cf-connecting-ip") ?? "local"}`;
    const key = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity))), b => b.toString(16).padStart(2, "0")).join("");
    await db.prepare("DELETE FROM contact_rate_limits WHERE started_at < ?").bind(now - 86400000).run();
    const limit = await db.prepare(`INSERT INTO contact_rate_limits VALUES(?,1,?) ON CONFLICT(client_key) DO UPDATE SET request_count=CASE WHEN ?-started_at>=3600000 THEN 1 ELSE request_count+1 END, started_at=CASE WHEN ?-started_at>=3600000 THEN ? ELSE started_at END RETURNING request_count,started_at`).bind(key, now, now, now, now).first<{ request_count: number; started_at: number }>();
    if (!limit || limit.request_count > 5) return Response.json({ error: "送信回数の上限に達しました。しばらく待ってから再度お試しください。" }, { status: 429, headers: { ...headers, "Retry-After": String(limit ? Math.max(1, Math.ceil((limit.started_at + 3600000 - now) / 1000)) : 3600) } });
    await db.prepare("INSERT INTO contact_messages(id,name,email,category,store_name,reference_url,message,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(input.id, input.name, input.email, input.category, input.storeName, input.referenceUrl, input.message, new Date(now).toISOString()).run();
    return Response.json({ ok: true }, { status: 201, headers });
  } catch (error) {
    if (error instanceof AccessError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error("Contact submission failed");
    return Response.json({ error: "送信できませんでした。時間をおいて再度お試しください。" }, { status: 503, headers });
  }
}
