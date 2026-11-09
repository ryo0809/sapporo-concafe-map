import {randomBytes,randomUUID,scryptSync} from "node:crypto";
import {mkdir} from "node:fs/promises";
import path from "node:path";

const email="local-test@example.test";
const nickname="Local Tester";
const password="LocalMember!2026";

await mkdir("reports/wrangler",{recursive:true});
process.env.WRANGLER_LOG_PATH??=path.resolve("reports/wrangler");
process.env.WRANGLER_SEND_METRICS="false";

const {getPlatformProxy}=await import("wrangler");
const persist=path.resolve(process.env.D1_PERSIST_PATH||".wrangler/state","v3");
const proxy=await getPlatformProxy({persist:{path:persist}});
try{
  if(proxy.env.APP_ENV!=="development")throw new Error("テスト会員はローカル開発環境にのみ作成できます。");
  // Keep these parameters in sync with src/infrastructure/members/password.ts.
  const salt=randomBytes(16).toString("hex");
  const digest=scryptSync(password,Buffer.from(salt,"hex"),64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString("hex");
  const passwordHash=["scrypt","32768","8","3",salt,digest].join("$");
  const now=new Date().toISOString();
  const db=proxy.env.DB;
  await db.prepare("INSERT INTO members(id,email,created_at,nickname,password_hash,email_verified_at) VALUES(?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET nickname=excluded.nickname,password_hash=excluded.password_hash,email_verified_at=excluded.email_verified_at")
    .bind(randomUUID(),email,now,nickname,passwordHash,now).run();
  await db.prepare("DELETE FROM member_password_attempts WHERE email=?").bind(email).run();
  console.log(`ローカルテスト会員を準備しました: ${email}`);
}finally{
  await proxy.dispose();
}
