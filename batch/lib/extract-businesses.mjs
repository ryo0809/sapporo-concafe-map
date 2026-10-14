import { load } from "cheerio";

/** JSON-LDは候補として抽出する。業態・営業状況・エリアを自動確定しない。 */
export function extractBusinesses(html) {
  const $ = load(html);
  const candidates = [];
  const warnings = [];
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    if (value["@graph"]) visit(value["@graph"]);
    const types = [value["@type"]].flat();
    if (types.some((type) => ["LocalBusiness", "CafeOrCoffeeShop", "BarOrPub", "NightClub", "Restaurant"].includes(type))) {
      candidates.push({ name: value.name ?? null, address: value.address ?? null,
        geo: value.geo ?? null, url: value.url ?? null, types });
    }
  }
  $('script[type="application/ld+json"]').each((_, element) => {
    try { visit(JSON.parse($(element).text())); }
    catch { warnings.push("JSON-LDの解析に失敗しました。手動確認が必要です。"); }
  });
  return { candidates, warnings };
}

