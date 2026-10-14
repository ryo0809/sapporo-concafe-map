import type { CafeSummary } from "@/application/cafes/list-cafes";

export function getBuildingDetails(address: string) {
  const normalized = address.normalize("NFKC").replace(/[一二三四五六七八九]/g, (value) => String("一二三四五六七八九".indexOf(value) + 1));
  const street = normalized.match(/南\d+条[東西]\d+/)?.[0] ?? "";
  const floorMatch = normalized.match(/(地下\s*\d+\s*階|B?\s*\d+\s*(?:F|階))\s*(?:\([^)]*\))?$/i);
  const floor = floorMatch ? floorMatch[1].replace(/\s/g, "").replace("地下", "B").replace("階", "F").toUpperCase() : "";
  let name = normalized.replace(/^(?:〒[\d-]+\s*)?(?:北海道)*(?:札幌市中央区)?\s*/, "")
    .replace(/^南\d+条[東西]\d+(?:丁目)?(?:[\s\-‐−ー－]*\d+(?:番地?|号)?){0,3}\s*/, "")
    .replace(/(地下\s*\d+\s*階|B?\s*\d+\s*(?:F|階))\s*(?:\([^)]*\))?$/i, "").trim();
  if (!name || !/[A-Za-z\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}]/u.test(name)) return { key: "unknown", name: "ビル名未確認", floor, street: "" };
  if (/^(?:第|No\.?\s*)?([123])(?:G|グリーン)ビル$/i.test(name)) name = name.replace(/^(?:第|No\.?\s*)?([123])(?:G|グリーン)ビル$/i, "第$1グリーンビル");
  if (/^N[.・\s]*(?:VICORO|VICOLO|ヴィコロ)ビル$/i.test(name)) name = "N・ヴィコロビル";
  if (/^エヌ\s*スタービル$/.test(name)) name = "Nスタービル";
  const key = `${street}|${name.toLowerCase().replace(/[\s.・]/g, "")}`;
  return { key, name, floor, street };
}

export function groupCafesByBuilding(cafes: readonly CafeSummary[]) {
  const groups = new Map<string, { key: string; name: string; street: string; stores: { cafe: CafeSummary; floor: string }[] }>();
  for (const cafe of cafes) {
    const building = getBuildingDetails(cafe.address);
    if (!groups.has(building.key)) groups.set(building.key, { ...building, stores: [] });
    groups.get(building.key)!.stores.push({ cafe, floor: building.floor });
  }
  const floorOrder = (floor: string) => floor ? (floor.startsWith("B") ? -1 : 1) * Number(floor.replace(/\D/g, "")) : 999;
  return [...groups.values()].sort((a, b) => (a.key === "unknown" ? 1 : b.key === "unknown" ? -1 : a.name.localeCompare(b.name, "ja")))
    .map((group) => ({ ...group, stores: group.stores.sort((a, b) => floorOrder(a.floor) - floorOrder(b.floor) || a.cafe.name.localeCompare(b.cafe.name, "ja")) }));
}
