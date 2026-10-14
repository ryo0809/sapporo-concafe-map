import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CafeRepository } from "@/domain/cafes/cafe-repository";
import type { Cafe } from "@/domain/cafes/cafe";
import { validateCafeCatalog } from "@/domain/cafes/catalog-policy";

interface CollectedCafe {
  id: string; name: string; address: string; area: string;
  category: string; location: { latitude: number; longitude: number } | null;
  businessStatus: string;
  sources: { provider: string; url: string; fetchedAt: string }[];
}

export function projectCollection(records: readonly CollectedCafe[]): readonly Cafe[] {
  const entries = records.filter((record) => !["closed", "temporarily_closed", "moved"].includes(record.businessStatus)).map((record) => {
    const source = record.sources.find((source) => source.provider === "official") ?? record.sources[0];
    if (!source || !Number.isFinite(Date.parse(source.fetchedAt))) throw new Error(`取得元または取得日時が不正です: ${record.id}`);
    return { id: record.id, name: record.name, address: record.address, area: record.area,
      category: record.category, location: record.location,
      sourceUrl: source.url, verifiedOn: source.fetchedAt.slice(0, 10), fetchedAt: source.fetchedAt,
      businessStatus: record.businessStatus === "operating" ? "operating" : "unknown",
      locationGroup: record.location ? `${record.location.latitude.toFixed(5)},${record.location.longitude.toFixed(5)}` : record.id,
      coordinateSource: record.location ? "取得元の構造化データ。位置の正確性は未確認です" : "座標未取得", };
  });
  return validateCafeCatalog(entries);
}

/** バッチが最後まで保存した最新スナップショットを表示する。 */
export class CollectionCafeRepository implements CafeRepository {
  async findAll(): Promise<readonly Cafe[]> {
    const base = path.join(process.cwd(), "data/collections");
    const latest = JSON.parse(await readFile(path.join(base, "latest.json"), "utf8"));
    if (typeof latest.runId !== "string" || !/^\d{8}T\d+Z$/.test(latest.runId)) throw new Error("取得実行IDが不正です");
    const directory = path.join(base, latest.runId);
    const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
    if (!manifest.complete) throw new Error("最新バッチが部分取得です。取得エラーを確認してください");
    const records: CollectedCafe[] = [];
    for (const area of ["tanukikoji", "susukino"]) {
      for (const file of manifest.areas[area].files) {
        if (typeof file !== "string" || !new RegExp(`^${area}/\\d{3,}\\.json$`).test(file)) throw new Error("取得ファイルのパスが不正です");
        const chunk = JSON.parse(await readFile(path.join(directory, file), "utf8"));
        if (!Array.isArray(chunk) || chunk.length > 100 || chunk.some((entry) => entry.area !== area)) throw new Error("取得ファイルのエリアまたは件数が不正です");
        records.push(...chunk);
      }
    }
    if (records.length !== manifest.count) throw new Error("取得件数が一致しません");
    return projectCollection(records);
  }
}
