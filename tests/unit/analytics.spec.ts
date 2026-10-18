import {expect, test} from "@playwright/test";
import {analyticsResponse, validEvent} from "../../worker/analytics.mjs";

const event = {version: 1, event: "outbound_click", page: "/", cafeId: "cafe-1", medium: "x", source: "detail"};
function request(body: unknown = event, headers = {}) {
  return new Request("https://sapporo-concafe-map.com/api/analytics", {method: "POST", headers: {origin: "https://sapporo-concafe-map.com", "content-type": "application/json", "cf-connecting-ip": "192.0.2.1", ...headers}, body: JSON.stringify(body)});
}
function setup() {
  const points: unknown[] = [];
  return {points, env: {APP_ENV: "production", ANALYTICS_ENABLED: "true", ANALYTICS: {writeDataPoint: (point: unknown) => points.push(point)}, ANALYTICS_RATE_LIMITER: {limit: async () => ({success: true})}}};
}

test("rejects private fields, arbitrary pages and invalid metric values", () => {
  expect(validEvent(event)).toBe(true);
  for (const invalid of [{...event, query: "secret"}, {...event, email: "private@example.com"}, {...event, page: "/admin"}, {...event, value: Infinity}, {...event, value: -1}, {...event, medium: "https://example.com"}, {...event, version: 2}, null]) expect(validEvent(invalid)).toBe(false);
});

test("stores only whitelisted fields without headers, cookies, IP or URL query", async () => {
  const {points, env} = setup();
  expect((await analyticsResponse(request(), env))?.status).toBe(204);
  expect(points).toEqual([{indexes: ["outbound_click"], blobs: ["1", "outbound_click", "production", "unknown", "/", "", "cafe-1", "detail", "x"], doubles: [0]}]);
});

test("disabled, nonproduction and administrator traffic cannot write", async () => {
  const {points, env} = setup();
  for (const variation of [{...env, APP_ENV: "staging"}, {...env, ANALYTICS_ENABLED: "false"}, {...env, ANALYTICS_RATE_LIMITER: undefined}]) await analyticsResponse(request(), variation);
  await analyticsResponse(request(event, {cookie: "admin_session=private"}), env);
  expect(points).toEqual([]);
});

test("rejects cross-origin, oversized and rate-limited traffic", async () => {
  const {points, env} = setup();
  expect((await analyticsResponse(request(event, {origin: "https://evil.example"}), env))?.status).toBe(403);
  expect((await analyticsResponse(request({...event, query: "a".repeat(3000)}), env))?.status).toBe(400);
  expect((await analyticsResponse(request(), {...env, ANALYTICS_RATE_LIMITER: {limit: async () => ({success: false})}}))?.status).toBe(429);
  expect(points).toEqual([]);
});

test("storage failure returns a bounded response and unrelated requests pass through", async () => {
  const {env} = setup();
  expect(await analyticsResponse(new Request("https://sapporo-concafe-map.com/"), env)).toBeNull();
  expect((await analyticsResponse(request(), {...env, ANALYTICS: {writeDataPoint() {throw new Error("unavailable");}}}))?.status).toBe(400);
});

test("schema rejects missing fields, wrong types and out-of-range identifiers and metrics", () => {
  for (const invalid of [
    {}, [], "event", {...event, event: undefined}, {...event, page: undefined},
    {...event, event: "unknown"}, {...event, version: "1"},
    {...event, area: "tokyo"}, {...event, source: "admin"},
    {...event, cafeId: ""}, {...event, cafeId: "a".repeat(81)},
    {...event, cafeId: "private@example.com"}, {...event, cafeId: 123},
    {...event, value: "0"}, {...event, value: 0.5},
    {...event, value: null}, {...event, value: 3600001}, {...event, value: NaN},
  ]) expect(validEvent(invalid), JSON.stringify(invalid)).toBe(false);
  for (const value of [0, 3600000]) expect(validEvent({...event, value, cafeId: "a".repeat(80)})).toBe(true);
});

test("wrong method, host, origin and content type cannot reach storage", async () => {
  const {points, env} = setup();
  const invalidRequests: [Request, number][] = [
    [new Request("https://sapporo-concafe-map.com/api/analytics"), 405],
    [new Request("https://www.sapporo-concafe-map.com/api/analytics", {method: "POST"}), 403],
    [request(event, {origin: "null"}), 403],
    [request(event, {origin: "http://sapporo-concafe-map.com"}), 403],
    [request(event, {"content-type": "text/plain"}), 415],
  ];
  for (const [input, status] of invalidRequests) {
    const response = await analyticsResponse(input, env);
    expect(response?.status).toBe(status);
    expect(response?.headers.get("cache-control")).toBe("no-store");
  }
  expect(points).toEqual([]);
});

test("missing infrastructure and missing platform IP fail closed", async () => {
  const {points, env} = setup();
  for (const variation of [
    {...env, ANALYTICS: undefined}, {...env, ANALYTICS_ENABLED: undefined},
    {...env, APP_ENV: "development"},
  ]) expect((await analyticsResponse(request(), variation))?.status).toBe(204);
  const input = request();
  input.headers.delete("cf-connecting-ip");
  let limiterCalls = 0;
  expect((await analyticsResponse(input, {...env, ANALYTICS_RATE_LIMITER: {limit: async () => {
    limiterCalls++; return {success: true};
  }}}))?.status).toBe(204);
  expect(limiterCalls).toBe(0);
  expect(points).toEqual([]);
});

test("malformed or empty JSON and limiter failure do not write or leak errors", async () => {
  const {points, env} = setup();
  for (const body of ["{", "", "null", "[]"]) {
    const input = new Request(request(), {body});
    const response = await analyticsResponse(input, env);
    expect(response?.status).toBe(400);
    expect(await response?.text()).toBe("");
  }
  const response = await analyticsResponse(request(), {...env, ANALYTICS_RATE_LIMITER: {limit: async () => {
    throw new Error("private platform error");
  }}});
  expect(response?.status).toBe(400);
  expect(await response?.text()).toBe("");
  expect(points).toEqual([]);
});

test("body limit counts streamed bytes and cancels oversized requests", async () => {
  const {points, env} = setup();
  const json = JSON.stringify(event);
  const makeRequest = (length: number, onCancel: () => void) => {
    const bytes = new TextEncoder().encode(json.padEnd(length, " "));
    let offset = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset === bytes.length) { controller.close(); return; }
        const next = Math.min(offset + 700, bytes.length);
        controller.enqueue(bytes.slice(offset, next)); offset = next;
      },
      cancel: onCancel,
    });
    return new Request(request(), {body, duplex: "half"} as RequestInit);
  };
  expect((await analyticsResponse(makeRequest(2048, () => {}), env))?.status).toBe(204);
  let cancelled = false;
  expect((await analyticsResponse(makeRequest(2800, () => { cancelled = true; }), env))?.status).toBe(400);
  expect(cancelled).toBe(true);
  expect(points).toHaveLength(1);
});

test("metric, area and release survive storage without request metadata", async () => {
  const {points, env} = setup();
  const input = request({version: 1, event: "search", page: "/", area: "susukino", source: "list", value: 0});
  expect((await analyticsResponse(input, {...env, ANALYTICS_RELEASE: "release-17"}))?.status).toBe(204);
  expect(points).toEqual([{indexes: ["search"], blobs: ["1", "search", "production", "release-17", "/", "susukino", "", "list", ""], doubles: [0]}]);
});
