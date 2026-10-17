import { isIP } from "node:net";

export function contactClientIp(headers: Headers, development = false): string | null {
  const ipv6 = headers.get("cf-connecting-ipv6")?.trim();
  if (ipv6 && ipv6.length <= 45 && isIP(ipv6) === 6) return ipv6;
  const ip = headers.get("cf-connecting-ip")?.trim();
  if (ip && ip.length <= 45 && isIP(ip)) return ip;
  // Next dev supplies this from the local connection. Never trust it in production.
  if (development) {
    const local = headers.get("x-forwarded-for")?.trim();
    if (local && local.length <= 45 && isIP(local)) return local;
  }
  return null;
}
