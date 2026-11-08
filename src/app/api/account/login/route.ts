import { checkOrigin, apiError, AccessError, readJson } from "@/infrastructure/admin/http-session";
import { getD1 } from "@/infrastructure/database/d1";
import { makeToken, hashToken } from "@/infrastructure/members/session";
import { sendEmail } from "@/infrastructure/mail/send-email";
import { contactClientIp } from "@/infrastructure/contact/client-ip";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { site } from "@/config/site";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await readJson(request);
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError(400,"メールアドレスを確認してください。");
    const db = await getD1(), now = Date.now();
    await db.batch([
      db.prepare("DELETE FROM member_login_limits WHERE sent_at<?").bind(now-86400000),
      db.prepare("DELETE FROM member_login_ip_limits WHERE started_at<?").bind(now-86400000),
    ]);
    const ip = contactClientIp(request.headers, process.env.NODE_ENV === "development");
    if (ip) {
      const clientKey=hashToken(`${Math.floor(now/86400000)}:${ip}`);
      const quota=await db.prepare("INSERT INTO member_login_ip_limits(client_key,requests,started_at) VALUES(?,1,?) ON CONFLICT(client_key) DO UPDATE SET requests=CASE WHEN ?-started_at>=3600000 THEN 1 ELSE requests+1 END,started_at=CASE WHEN ?-started_at>=3600000 THEN ? ELSE started_at END RETURNING requests").bind(clientKey,now,now,now,now).first<{requests:number}>();
      if(!quota||quota.requests>20)throw new AccessError(429,"送信回数の上限に達しました。しばらくしてからお試しください。");
    }
    const limit = await db.prepare("INSERT INTO member_login_limits(email,sent_at) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET sent_at=excluded.sent_at WHERE sent_at<=? RETURNING sent_at").bind(email,now,now-60000).first();
    if (!limit) return Response.json({ok:true},{status:202,headers:{"Cache-Control":"no-store"}});
    const token = makeToken();
    await db.prepare("DELETE FROM member_login_tokens WHERE email=? OR expires_at<?").bind(email,now).run();
    await db.prepare("INSERT INTO member_login_tokens(token_hash,email,expires_at) VALUES(?,?,?)").bind(hashToken(token),email,now+900000).run();
    const {env}=await getCloudflareContext({async:true});
    const url = new URL(`/account/verify/${token}`, (env as CloudflareEnv & {APP_ENV?:string}).APP_ENV==="production"?site.url:request.url);
    try {
      await sendEmail({to:email,key:`member-login/${hashToken(token)}`,subject:"コンカフェマップへのログイン",text:`以下のリンクを15分以内に開いてログインしてください。\n${url.href}\n\n心当たりがなければ、このメールを無視してください。`});
    } catch(error) {
      await db.prepare("DELETE FROM member_login_tokens WHERE token_hash=?").bind(hashToken(token)).run();
      throw error;
    }
    return Response.json({ok:true},{status:202,headers:{"Cache-Control":"no-store"}});
  } catch(error) { return apiError(error); }
}
