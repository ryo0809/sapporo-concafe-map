import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export const dummyMemberPasswordHash = `scrypt$32768$8$3$${"0".repeat(32)}$${"0".repeat(128)}`;

export function hashMemberPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, Buffer.from(salt,"hex"), 64, options).toString("hex");
  return `scrypt$32768$8$3$${salt}$${digest}`;
}

export function verifyMemberPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt" || parts[1] !== "32768" || parts[2] !== "8" || parts[3] !== "3" || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{128}$/.test(parts[5])) return false;
  const actual = scryptSync(password, Buffer.from(parts[4],"hex"), 64, options);
  return timingSafeEqual(actual, Buffer.from(parts[5],"hex"));
}
