import type { Cafe } from "@/domain/cafes/cafe";
import type { CafeRepository } from "@/domain/cafes/cafe-repository";
import { validateCafeCatalog } from "@/domain/cafes/catalog-policy";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** 確認済み台帳を読み込む。外部サイトの応答をそのまま公開しない。 */
export class CatalogCafeRepository implements CafeRepository {
  async findAll(): Promise<readonly Cafe[]> {
    return readCatalog();
  }
}

async function readCatalog(): Promise<readonly Cafe[]> {
    "use cache";
    const records: unknown[] = [];
    for (const area of ["tanukikoji", "susukino"]) {
      const directory = path.join(process.cwd(), "src/infrastructure/cafes/data", area);
      const files = (await readdir(directory)).filter((name) => /^\d{3,}\.json$/.test(name)).sort();
      for (const file of files) {
        const chunk = validateCafeCatalog(JSON.parse(await readFile(path.join(directory, file), "utf8")));
        if (chunk.length > 100 || chunk.some((cafe) => cafe.area !== area)) throw new Error(`店舗ファイルの件数またはエリアが不正です: ${file}`);
        records.push(...chunk);
      }
    }
    return validateCafeCatalog(records);
}
