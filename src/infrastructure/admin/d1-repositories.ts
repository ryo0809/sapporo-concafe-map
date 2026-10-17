import "server-only";
import { randomBytes } from "node:crypto";
import { dummyPasswordHash, tokenHash, verifyPassword } from "../../../db/passwords.mjs";
import { getD1 } from "../database/d1";
import { D1CafeStore } from "../database/d1-cafe-store";
import type { AuthenticationRepository, ManagementRepository, Administrator } from "@/domain/admin/repositories";

export class D1ManagementRepository extends D1CafeStore implements ManagementRepository {
  constructor() { super(getD1); }
}

export class D1AuthenticationRepository implements AuthenticationRepository {
  async login(username: string, password: string) {
    const db = await getD1();
    const now = Date.now();
    const attempt = await db.prepare("SELECT failures,started_at FROM login_attempts WHERE username=?").bind(username).first<{ failures: number; started_at: number }>();
    if (attempt && attempt.failures >= 5 && now - attempt.started_at < 900000) {
      throw Object.assign(new Error("ログインの試行回数を超えました。"), { code: "RATE_LIMIT" });
    }
    const admin = await db.prepare("SELECT id,username,password_hash FROM administrators WHERE username=?").bind(username).first<Administrator & { password_hash: string }>();
    const valid = verifyPassword(password, admin?.password_hash ?? dummyPasswordHash);
    if (!admin || !valid) {
      await db.prepare(`INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(username) DO UPDATE SET
        failures=CASE WHEN ?-started_at>=900000 THEN 1 ELSE failures+1 END,
        started_at=CASE WHEN ?-started_at>=900000 THEN ? ELSE started_at END`).bind(username, now, now, now, now).run();
      return null;
    }
    const token = randomBytes(32).toString("hex"), expiresAt = now + 86400000;
    await db.batch([
      db.prepare("DELETE FROM login_attempts WHERE username=?").bind(username),
      db.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now),
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").bind(tokenHash(token), admin.id, expiresAt),
    ]);
    return { token, expiresAt, administrator: { id: admin.id, username: admin.username } };
  }

  async session(token: string): Promise<Administrator | null> {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const db = await getD1();
    return db.prepare("SELECT a.id,a.username FROM sessions s JOIN administrators a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>?")
      .bind(tokenHash(token), Date.now()).first<Administrator>();
  }

  async logout(token: string) {
    if (token) await (await getD1()).prepare("DELETE FROM sessions WHERE token_hash=?").bind(tokenHash(token)).run();
  }
}
