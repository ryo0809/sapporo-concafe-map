import { test, expect } from "@playwright/test";
import { contactClientIp } from "../../src/infrastructure/contact/client-ip";

test("Cloudflareの有効なIPv4/IPv6を取得し、偽装可能な転送ヘッダーは本番で使用しない", () => {
  expect(contactClientIp(new Headers({ "cf-connecting-ip": "192.0.2.45" }))).toBe("192.0.2.45");
  expect(contactClientIp(new Headers({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  expect(contactClientIp(new Headers({ "cf-connecting-ip": "240.0.0.1", "cf-connecting-ipv6": "2001:db8::2" }))).toBe("2001:db8::2");
  expect(contactClientIp(new Headers({ "cf-connecting-ip": "192.0.2.45", "cf-connecting-ipv6": "invalid" }))).toBe("192.0.2.45");
  const invalid: Record<string, string>[] = [{}, { "x-forwarded-for": "192.0.2.99" }, { "x-real-ip": "192.0.2.99" }, { "cf-connecting-ip": "not-an-ip" }, { "cf-connecting-ip": "192.0.2.1, 192.0.2.2" }];
  for (const headers of invalid) expect(contactClientIp(new Headers(headers))).toBeNull();
  expect(contactClientIp(new Headers({ "x-forwarded-for": "127.0.0.1" }), true)).toBe("127.0.0.1");
  expect(contactClientIp(new Headers({ "x-forwarded-for": "bad" }), true)).toBeNull();
});
