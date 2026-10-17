import { createHash } from "node:crypto";
import { load } from "cheerio";
import { extractBusinesses } from "./extract-businesses.mjs";

export const normalize = (text) => String(text ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
const nameKey = (name) => normalize(name).toLowerCase()
  .replace(/\([^)]*\)/g, "")
  .replace(/^(?:コスプレ酒場|和装こんせぷとばー|猫耳メイドカフェバー|にゃんこメイドカフェ)/, "")
  .replace(/[\s\p{P}\p{S}]/gu, "");

export function canonicalAddress(address) {
  return normalize(address).replace(/[一二三四五六七八九]/g, (value) => String("一二三四五六七八九".indexOf(value) + 1))
    .replace(/北海道|\s/g, "").replace(/[‐−ー－–]/g, "-")
    .replace(/丁目|番地?|号/g, "-").replace(/地下(\d+)(?:階|F)/g, "B$1F").replace(/(\d+)階/g, "$1F").replace(/-+/g, "-");
}

export function classifyArea(name, address) {
  const text = normalize(address).replace(/[一二三四五六七八九]/g, (value) => String("一二三四五六七八九".indexOf(value) + 1));
  if (!text.includes("札幌") || !text.includes("中央区")) return null;
  if (/南(?:[4-9]|10)条/.test(text)) return "susukino";
  if (/南[23]条/.test(text) || /狸小路/.test(name + text)) return "tanukikoji";
  return null;
}

export function discoverPages(html, pageUrl, source) {
  const $ = load(html);
  const shops = new Map();
  const pagination = new Set();
  const root = new URL(pageUrl);
  $("a[href]").each((_, element) => {
    let url;
    try { url = new URL($(element).attr("href"), root); } catch { return; }
    if (url.origin !== root.origin) return;
    url.hash = "";
    const shop = source === "pokepara"
      ? /^\/_hokkaido\/m801\/a1801\/shop\d+\/$/.test(url.pathname)
      : /^\/a01\/a0101\/a010101\/a01010101\/\d+\/$/.test(url.pathname);
    if (shop) {
      const name = normalize($(element).find("h2,h3").first().text() || $(element).text()).split("札幌・すすきの")[0].trim();
      // The same store can have a title link and an empty image link.
      if (name || !shops.has(url.href)) shops.set(url.href, name);
    }
    const base = source === "pokepara" ? "/_hokkaido/m801/a1801/g220/" : "/a01/a0101/a010101/a01010101/";
    if (url.href !== root.href && url.pathname.startsWith(base) && !shop &&
        (/\/page\/\d+\/$/.test(url.pathname) || /(?:page|p)=\d+/.test(url.search) || $(element).attr("rel") === "next")) pagination.add(url.href);
  });
  return { shops: [...shops].map(([url, name]) => ({ url, name })), pagination: [...pagination] };
}

function addressText(address) {
  return typeof address === "string" ? normalize(address) : normalize([address?.addressRegion, address?.addressLocality, address?.streetAddress].filter(Boolean).join(""));
}

export function extractStore(html, url, source, fetchedAt, fallbackName = "") {
  const $ = load(html);
  const businesses = extractBusinesses(html).candidates;
  const business = businesses.find((entry) => entry.url === url) ?? businesses[0];
  const fields = new Map();
  $(".top-content-item").each((_, e) => {
    const body = $(e).find(".top-content-body").clone(); body.find("a").remove();
    fields.set(normalize($(e).find(".top-content-head").text()), normalize(body.text()));
  });
  $("tr").each((_, e) => {
    const heading = normalize($(e).find("th").text());
    const value = normalize($(e).find("td").text() || $(e).next("tr").find("td").text());
    if (heading && value) fields.set(heading, value);
  });
  $("legend").each((_, e) => { fields.set(normalize($(e).text()), normalize($(e).siblings("p").text())); });
  const heading = normalize($("h1").first().text());
  const name = normalize((source === "official" ? fallbackName : "") || business?.name || heading.split(/・[^・]+ - | - /)[0] || fallbackName);
  const iframeAddress = $("iframe[title]").map((_, e) => $(e).attr("title")).get().find((title) => /札幌市中央区南/.test(title)) ?? "";
  const address = addressText(business?.address) || fields.get("住所") || iframeAddress;
  const geo = business?.geo;
  const latitude = Number(geo?.latitude), longitude = Number(geo?.longitude);
  const location = geo && Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  let updatedAt = null;
  $('script[type="application/ld+json"]').each((_, e) => {
    try {
      const value = JSON.parse($(e).text());
      for (const node of [value, ...(value["@graph"] ?? [])]) {
        if (node.dateModified && Number.isFinite(Date.parse(node.dateModified))) updatedAt = node.dateModified;
      }
    } catch { /* 壊れた構造化データは候補の確定に使わない。 */ }
  });
  const links = [];
  $(".top-content-item a[href], tr a[href]").each((_, e) => {
    let link;
    try { link = new URL($(e).attr("href"), url); } catch { return; }
    if (link.protocol !== "https:") return;
    const label = normalize($(e).text());
    const parentLabel = normalize($(e).closest(".top-content-item").find(".top-content-head").text());
    const tableHeading = normalize($(e).closest("tr").prev("tr").find("th").text());
    if (/Webサイト|公式|ホームページ|SNS/.test(label + parentLabel + tableHeading)) {
      links.push({ url: link.href, kind: /(?:^|\.)(?:x.com|twitter.com|instagram.com|tiktok.com)$/.test(link.hostname) ? "social" : "website" });
    }
  });
  // 個人ブログ・関連記事の「閉店」を店舗の閉店と誤認しない。
  const closed = /^(?:【|\[|\()?閉店(?:】|\]|\))/.test(heading);
  return { name, address, area: classifyArea(name, address), category: /メイド/.test(name) ? "maid" : "unknown",
    location, businessStatus: closed ? "closed" : "unknown", statusEvidence: closed ? { url, kind: "explicit-closed-title" } : null,
    source: { provider: source, url, fetchedAt, updatedAt }, links: [...new Map(links.map((link) => [link.url, link])).values()] };
}

export function mergeObservations(observations) {
  const groups = new Map();
  for (const observation of observations) {
    if (!observation.area || !observation.name || !observation.address) continue;
    // 同じ名称・エリアでも住所が違う場合は移転・同名店として別レコードを保持。
    const canonical = canonicalAddress(observation.address);
    const street = canonical.match(/南\d+条[東西]\d+(?:-\d+){0,2}/)?.[0];
    const floor = canonical.match(/(?:B\d+|\d+)F/i)?.[0]?.toUpperCase();
    const addressKey = street && floor ? `${street}|${floor}` : canonical;
    const key = `${observation.area}|${nameKey(observation.name)}|${addressKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(observation);
  }
  return [...groups].map(([key, records]) => {
    const closed = records.some((entry) => entry.businessStatus === "closed");
    const locations = records.filter((entry) => entry.location).map((entry) => entry.location);
    const first = records.find((entry) => entry.source.provider === "official") ?? records[0];
    return { id: createHash("sha256").update(key).digest("hex").slice(0,16), name: first.name, address: first.address,
      area: first.area, category: records.find((entry) => entry.category !== "unknown")?.category ?? "unknown",
      location: locations[0] ?? null, businessStatus: closed ? "closed" : "unknown",
      publishable: false, reviewReasons: [closed ? "閉店表示の根拠を確認" : "営業継続の根拠を未確認", ...(!locations.length ? ["座標未取得"] : []),
        ...(new Set(records.map((entry) => canonicalAddress(entry.address))).size > 1 ? ["住所の表記差を確認"] : [])],
      sources: records.map((entry) => entry.source), observations: records,
      links: [...new Map(records.flatMap((entry) => entry.links).map((link) => [link.url, link])).values()] };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export function chunkRecords(records, size = 100) {
  if (!Number.isInteger(size) || size < 1) throw new Error("分割サイズは正の整数です");
  return records.length ? Array.from({ length: Math.ceil(records.length / size) }, (_, i) => records.slice(i * size, (i + 1) * size)) : [[]];
}
