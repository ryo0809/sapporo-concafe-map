import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getD1 } from "@/infrastructure/database/d1";

export const memberCookie = "sapporo_member_session";
export const makeToken = () => randomBytes(32).toString("hex");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export async function currentMember() {
  const token = (await cookies()).get(memberCookie)?.value ?? "";
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return (await getD1()).prepare("SELECT m.id,m.email FROM member_sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires_at>?").bind(hashToken(token), Date.now()).first<{id:string;email:string}>();
}
