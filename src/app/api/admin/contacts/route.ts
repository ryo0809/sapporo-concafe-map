import { requireAdministrator, readJson, apiError, AccessError } from "@/infrastructure/admin/http-session";
import { getD1 } from "@/infrastructure/database/d1";
import type { ContactMessage } from "@/domain/contact";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  try {
    await requireAdministrator();
    const status = new URL(request.url).searchParams.get("status") === "done" ? "done" : "new";
    const db = await getD1();
    const messages = await db.prepare("SELECT * FROM contact_messages WHERE status=? ORDER BY created_at DESC LIMIT 100").bind(status).all<ContactMessage>();
    return Response.json({ messages: messages.results }, { headers });
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try {
    await requireAdministrator();
    const input = await readJson(request);
    if (typeof input.id !== "string" || !["new", "done"].includes(input.status)) throw new AccessError(400, "入力内容を確認してください。");
    await (await getD1()).prepare("UPDATE contact_messages SET status=? WHERE id=?").bind(input.status, input.id).run();
    return Response.json({ ok: true }, { headers });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  try {
    await requireAdministrator();
    const input = await readJson(request);
    if (typeof input.id !== "string") throw new AccessError(400, "入力内容を確認してください。");
    await (await getD1()).prepare("DELETE FROM contact_messages WHERE id=?").bind(input.id).run();
    return Response.json({ ok: true }, { headers });
  } catch (error) { return apiError(error); }
}
