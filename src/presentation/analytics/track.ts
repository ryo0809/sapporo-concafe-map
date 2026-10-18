type EventName = "page_view" | "area_select" | "detail_open" | "detail_close" | "outbound_click" | "building_select" | "map_reset" | "map_ready" | "map_error" | "search" | "contact_success" | "contact_error" | "contact_invalid";
type Attributes = { area?: "susukino" | "tanukikoji"; cafeId?: string; source?: "map" | "list" | "detail" | "form" | "page"; medium?: "official" | "x" | "instagram" | "tiktok" | "facebook" | "youtube" | "line" | "other"; value?: number };

let windowStarted = 0;
let count = 0;
let lastInvalid = 0;

export function track(event: EventName, attributes: Attributes = {}) {
  try {
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" || typeof window === "undefined"
      || window.location.hostname !== "sapporo-concafe-map.com" || navigator.webdriver
      || navigator.doNotTrack === "1" || (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl) return;
    const page = window.location.pathname;
    if (!["/", "/contact", "/privacy", "/listing-information"].includes(page)) return;
    const now = Date.now();
    if (now - windowStarted >= 60000) { windowStarted = now; count = 0; }
    if (count >= 60 || (event === "contact_invalid" && now - lastInvalid < 1000)) return;
    if (event === "contact_invalid") lastInvalid = now;
    count += 1;
    void fetch("/api/analytics", {method: "POST", credentials: "same-origin", keepalive: true,
      headers: {"Content-Type": "application/json"}, body: JSON.stringify({version: 1, event, page, ...attributes})}).catch(() => {});
  } catch { /* Analytics must not interrupt navigation or map interactions. */ }
}
