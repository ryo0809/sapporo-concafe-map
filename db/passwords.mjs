import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, hash) {
  const [salt, digest] = hash.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(digest ?? "")) return false;
  const value = scryptSync(password, salt, 64);
  return timingSafeEqual(value, Buffer.from(digest, "hex"));
}

export const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
// Same amount of password hashing work for unknown and existing usernames.
export const dummyPasswordHash = `${"0".repeat(32)}:${"0".repeat(128)}`;
