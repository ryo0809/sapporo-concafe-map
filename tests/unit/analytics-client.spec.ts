import {expect, test} from "@playwright/test";
import {track} from "../../src/presentation/analytics/track";

test("client sends safe attributes, tolerates failures and excludes private contexts", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalFetch = globalThis.fetch;
  const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
  const location = {hostname: "sapporo-concafe-map.com", pathname: "/", search: "?email=private@example.com"};
  const navigator = {webdriver: false, doNotTrack: "0", globalPrivacyControl: false};
  const sent: RequestInit[] = [];
  try {
    Object.defineProperty(globalThis, "window", {configurable: true, value: {location}});
    Object.defineProperty(globalThis, "navigator", {configurable: true, value: navigator});
    globalThis.fetch = async (_url, options) => { sent.push(options!); throw new Error("offline"); };
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "true";
    expect(() => track("search", {area: "susukino", value: 0})).not.toThrow();
    await Promise.resolve();
    expect(JSON.parse(String(sent[0].body))).toEqual({version: 1, event: "search", page: "/", area: "susukino", value: 0});
    expect(sent[0].keepalive).toBe(true);
    navigator.webdriver = true; track("page_view"); navigator.webdriver = false;
    navigator.doNotTrack = "1"; track("page_view"); navigator.doNotTrack = "0";
    navigator.globalPrivacyControl = true; track("page_view"); navigator.globalPrivacyControl = false;
    location.hostname = "localhost"; track("page_view"); location.hostname = "sapporo-concafe-map.com";
    location.pathname = "/admin"; track("page_view"); location.pathname = "/";
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "false"; track("page_view");
    expect(sent).toHaveLength(1);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator); else Reflect.deleteProperty(globalThis, "navigator");
    globalThis.fetch = originalFetch;
    if (enabled === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED; else process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = enabled;
  }
});

// Each fixture advances the clock to a fresh rate-limit window without exposing test hooks in production.
let fixtureTime = Date.now();
async function withClient(run: (sent: RequestInit[], advance: (ms: number) => void) => void | Promise<void>, synchronousFailure = false) {
  const descriptors = new Map(["window", "navigator"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
  fixtureTime += 120000;
  let now = fixtureTime;
  const sent: RequestInit[] = [];
  try {
    Date.now = () => now;
    Object.defineProperty(globalThis, "window", {configurable: true, value: {location: {hostname: "sapporo-concafe-map.com", pathname: "/contact"}}});
    Object.defineProperty(globalThis, "navigator", {configurable: true, value: {webdriver: false, doNotTrack: "0"}});
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "true";
    globalThis.fetch = (_url, options) => {
      sent.push(options!);
      if (synchronousFailure) throw new Error("fetch unavailable");
      return Promise.resolve(new Response(null, {status: 204}));
    };
    await run(sent, ms => { now += ms; });
  } finally {
    Date.now = originalNow; globalThis.fetch = originalFetch;
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
    }
    if (enabled === undefined) delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED; else process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = enabled;
  }
}

test("client caps events at 60 per minute and resumes exactly at the next window", async () => {
  await withClient((sent, advance) => {
    for (let i = 0; i < 61; i++) track("detail_open", {cafeId: "cafe-1"});
    expect(sent).toHaveLength(60);
    advance(59999); track("page_view");
    expect(sent).toHaveLength(60);
    advance(1); track("page_view");
    expect(sent).toHaveLength(61);
  });
});

test("input validation events are throttled without suppressing other actions", async () => {
  await withClient((sent, advance) => {
    track("contact_invalid"); track("contact_invalid");
    expect(sent).toHaveLength(1);
    track("contact_success");
    expect(sent).toHaveLength(2);
    advance(999); track("contact_invalid");
    expect(sent).toHaveLength(2);
    advance(1); track("contact_invalid");
    expect(sent).toHaveLength(3);
  });
});

test("synchronous transport failure cannot interrupt a user action", async () => {
  await withClient(sent => {
    expect(() => track("outbound_click", {medium: "official"})).not.toThrow();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({method: "POST", credentials: "same-origin", keepalive: true});
  }, true);
});

test("server-side rendering does not attempt a browser request", async () => {
  await withClient(sent => {
    Reflect.deleteProperty(globalThis, "window");
    expect(() => track("page_view")).not.toThrow();
    expect(sent).toEqual([]);
  });
});
