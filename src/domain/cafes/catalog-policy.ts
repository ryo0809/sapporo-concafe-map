import type { Cafe } from "./cafe";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("店舗情報の形式が不正です");
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("店舗情報の必須項目が空です");
  return value;
}

/** 外部データの公開前に、識別子・種別・エリア・位置・確認元を検証する。 */
export function validateCafeCatalog(input: unknown): readonly Cafe[] {
  if (!Array.isArray(input)) throw new Error("店舗台帳は配列である必要があります");
  const ids = new Set<string>();
  return input.map((value) => {
    const entry = record(value);
    const id = text(entry.id);
    if (ids.has(id)) throw new Error(`店舗IDが重複しています: ${id}`);
    ids.add(id);
    const category = entry.category;
    const area = entry.area;
    if (category !== "concept" && category !== "maid" && category !== "unknown") throw new Error(`店舗種別が不正です: ${id}`);
    if (area !== "tanukikoji" && area !== "susukino") throw new Error(`店舗エリアが不正です: ${id}`);
    const location = entry.location === null ? null : record(entry.location);
    const latitude = location?.latitude;
    const longitude = location?.longitude;
    if (location !== null && (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      throw new Error(`店舗の座標が不正です: ${id}`);
    }
    const sourceUrl = text(entry.sourceUrl);
    if (new URL(sourceUrl).protocol !== "https:") throw new Error(`確認元はHTTPSである必要があります: ${id}`);
    const verifiedOn = text(entry.verifiedOn);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(verifiedOn) || !Number.isFinite(Date.parse(verifiedOn)) || new Date(verifiedOn).toISOString().slice(0, 10) !== verifiedOn) {
      throw new Error(`確認日が不正です: ${id}`);
    }
    return { id, name: text(entry.name), address: text(entry.address), category, area,
      location: location === null ? null : { latitude: latitude as number, longitude: longitude as number }, sourceUrl, verifiedOn,
      locationGroup: text(entry.locationGroup), coordinateSource: text(entry.coordinateSource),
      fetchedAt: typeof entry.fetchedAt === "string" ? entry.fetchedAt : undefined,
      businessStatus: entry.businessStatus === "operating" ? "operating" : "unknown" };
  });
}
