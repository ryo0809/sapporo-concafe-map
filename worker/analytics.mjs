const events = new Set(["page_view", "area_select", "detail_open", "detail_close", "outbound_click", "building_select", "map_reset", "map_ready", "map_error", "search", "contact_success", "contact_error", "contact_invalid"]);
const pages = new Set(["/", "/contact", "/privacy", "/listing-information"]);
const sources = new Set(["map", "list", "detail", "form", "page"]);
const media = new Set(["official", "x", "instagram", "tiktok", "facebook", "youtube", "line", "other"]);

// Deliberately reject unknown fields: queries, URLs and form contents must never reach storage.
export function validEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.keys(value).some(key => !["version", "event", "page", "area", "cafeId", "source", "medium", "value"].includes(key))) return false;
  return value.version === 1 && events.has(value.event) && pages.has(value.page)
    && (value.area === undefined || ["tanukikoji", "susukino"].includes(value.area))
    && (value.cafeId === undefined || (typeof value.cafeId === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value.cafeId)))
    && (value.source === undefined || sources.has(value.source))
    && (value.medium === undefined || media.has(value.medium))
    && (value.value === undefined || (Number.isInteger(value.value) && value.value >= 0 && value.value <= 3600000));
}

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error("size"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function analyticsResponse(request, env) {
  if (new URL(request.url).pathname !== "/api/analytics") return null;
  const reply = status => new Response(null, {status, headers: {"Cache-Control": "no-store"}});
  if (request.method !== "POST") return reply(405);
  // Fail closed until explicitly provisioned. No D1 writes, logging or paid fallback.
  if (env.APP_ENV !== "production" || env.ANALYTICS_ENABLED !== "true" || !env.ANALYTICS || !env.ANALYTICS_RATE_LIMITER) return reply(204);
  if (new URL(request.url).hostname !== "sapporo-concafe-map.com" || request.headers.get("origin") !== "https://sapporo-concafe-map.com") return reply(403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415);
  if (request.headers.has("cookie")) return reply(204); // Includes signed-in administrator traffic.
  try {
    const event = await readBody(request);
    if (!validEvent(event)) return reply(400);
    const ip = request.headers.get("cf-connecting-ip");
    if (!ip) return reply(204);
    // Raw IP is used only by the platform limiter, never in an analytics data point.
    const limit = await env.ANALYTICS_RATE_LIMITER.limit({key: ip});
    if (!limit.success) return reply(429);
    env.ANALYTICS.writeDataPoint({
      indexes: [event.event],
      blobs: ["1", event.event, "production", env.ANALYTICS_RELEASE || "unknown", event.page,
        event.area || "", event.cafeId || "", event.source || "", event.medium || ""],
      doubles: [event.value || 0],
    });
    return reply(204);
  } catch { return reply(400); }
}
