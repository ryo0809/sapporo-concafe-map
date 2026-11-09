import { getD1 } from "@/infrastructure/database/d1";
import { checkOrigin, AccessError } from "@/infrastructure/admin/http-session";
import { validateContact } from "@/domain/contact";
import { contactClientIp } from "@/infrastructure/contact/client-ip";
import { sendEmail } from "@/infrastructure/mail/send-email";
import { contactCategories } from "@/domain/contact";

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
        if (size > 65536) { await reader.cancel(); throw new AccessError(413, "送信データが大きすぎます。"); }
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
    const ipAddress = contactClientIp(request.headers, process.env.NODE_ENV === "development");
    const identity = `${Math.floor(now / 86400000)}:${ipAddress ?? "local"}`;
    const key = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity))), b => b.toString(16).padStart(2, "0")).join("");
    await db.prepare("DELETE FROM contact_rate_limits WHERE started_at < ?").bind(now - 86400000).run();
    const limit = await db.prepare(`INSERT INTO contact_rate_limits VALUES(?,1,?) ON CONFLICT(client_key) DO UPDATE SET request_count=CASE WHEN ?-started_at>=3600000 THEN 1 ELSE request_count+1 END, started_at=CASE WHEN ?-started_at>=3600000 THEN ? ELSE started_at END RETURNING request_count,started_at`).bind(key, now, now, now, now).first<{ request_count: number; started_at: number }>();
    if (!limit || limit.request_count > 5) return Response.json({ error: "送信回数の上限に達しました。しばらく待ってから再度お試しください。" }, { status: 429, headers: { ...headers, "Retry-After": String(limit ? Math.max(1, Math.ceil((limit.started_at + 3600000 - now) / 1000)) : 3600) } });
    await db.prepare("INSERT INTO contact_messages(id,name,email,category,store_name,reference_url,details_json,message,created_at,ip_address) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(input.id, input.name, input.email, input.category, input.storeName, input.referenceUrl, JSON.stringify(input.details), input.message, new Date(now).toISOString(), ipAddress).run();
    const saved = await db.prepare("SELECT id,name,email,category,store_name,reference_url,details_json,message,mail_sent_at FROM contact_messages WHERE id=?").bind(input.id).first<{id:string;name:string;email:string;category:keyof typeof contactCategories;store_name:string;reference_url:string;details_json:string;message:string;mail_sent_at:string|null}>();
    if (saved && !saved.mail_sent_at) {
      await sendEmail({
        to: "ryo.tanagp1@gmail.com", subject: `【コンカフェマップ】お問い合わせ：${contactCategories[saved.category] ?? "その他"}`,
        text: `お問い合わせが届きました。\n種類: ${contactCategories[saved.category] ?? saved.category}\n管理画面で確認: ${new URL("/admin?tab=contacts", request.url)}`,
      });
      await db.prepare("UPDATE contact_messages SET mail_sent_at=? WHERE id=? AND mail_sent_at IS NULL").bind(new Date().toISOString(), saved.id).run();
    }
    return Response.json({ ok: true }, { status: 201, headers });
  } catch (error) {
    if (error instanceof AccessError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error("Contact submission failed");
    return Response.json({ error: "送信できませんでした。時間をおいて再度お試しください。" }, { status: 503, headers });
  }
}
