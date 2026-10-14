import robotsParser from "robots-parser";
import { setTimeout as delay } from "node:timers/promises";

export function createPageFetcher() {
  const userAgent = "sapporo-concafe-map-collector/1.0 (+https://github.com/ryo0809/sapporo-concafe-map)";
  const hosts = new Map();
  const pageCache = new Map();
  async function request(url) {
    const response = await fetch(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.text();
  }
  return async function fetchPage(url) {
    if (pageCache.has(url)) return pageCache.get(url);
    const origin = new URL(url).origin;
    if (!hosts.has(origin)) {
      const robotsUrl = `${origin}/robots.txt`;
      const response = await fetch(robotsUrl, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(20000) });
      if (!response.ok && response.status !== 404) throw new Error(`robots.txt HTTP ${response.status}: ${origin}`);
      const rules = robotsParser(robotsUrl, response.status === 404 ? "" : await response.text());
      hosts.set(origin, { rules, lastRequest: Date.now(), interval: Math.max(1000, (rules.getCrawlDelay(userAgent) ?? 0) * 1000) });
    }
    const host = hosts.get(origin);
    if (host.rules.isAllowed(url, userAgent) === false) throw new Error(`robots.txtで取得禁止: ${url}`);
    if (host.interval > 60000) throw new Error(`Crawl-delayが60秒超のため取得を保留: ${origin}`);
    await delay(Math.max(0, host.interval - (Date.now() - host.lastRequest)));
    host.lastRequest = Date.now();
    const html = await request(url);
    pageCache.set(url, html);
    return html;
  };
}
