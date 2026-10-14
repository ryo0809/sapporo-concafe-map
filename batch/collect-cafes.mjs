import { readFile, readdir, mkdir, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createPageFetcher } from "./lib/fetch-page.mjs";
import { discoverPages, extractStore, mergeObservations, chunkRecords } from "./lib/collection.mjs";

const root = new URL("../", import.meta.url);
const areaLabels = { tanukikoji: "狸小路", susukino: "すすきの" };
export async function runCollection() {
  const startedAt = new Date().toISOString();
  const runId = startedAt.replace(/[-:.]/g, "");
  const directory = new URL(`data/collections/${runId}/`, root);
  await mkdir(directory, { recursive: true });
  const fetchPage = createPageFetcher();
  const observations = [], errors = [], excluded = [], discovery = [];
  const sources = [
    { provider: "pokepara", url: "https://www.pokepara.jp/_hokkaido/m801/a1801/g220/" },
    { provider: "cafecon", url: "https://cafecon.jp/a01/a0101/a010101/a01010101/" },
  ];
  for (const source of sources) {
    const queue = [source.url], visited = new Set(), shops = new Map();
    while (queue.length) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      try {
        const page = discoverPages(await fetchPage(url), url, source.provider);
        for (const shop of page.shops) shops.set(shop.url, shop);
        queue.push(...page.pagination.filter((next) => !visited.has(next)));
        if (page.shops.length === 0) errors.push({ provider: source.provider, url, error: "店舗リンク0件。取得形式の変更や空の一覧を確認してください" });
      } catch (error) { errors.push({ provider: source.provider, url, error: error.message }); }
    }
    discovery.push({ provider: source.provider, listPages: visited.size, detailPages: shops.size });
    console.log(`${source.provider}: ${shops.size}店舗ページを発見しました`);
    let completed = 0;
    for (const shop of shops.values()) {
      try {
        const record = extractStore(await fetchPage(shop.url), shop.url, source.provider, new Date().toISOString(), shop.name);
        if (record.area) observations.push(record);
        else excluded.push({ provider: source.provider, url: shop.url, name: record.name, address: record.address, reason: "住所未取得または対象エリア外" });
      } catch (error) { errors.push({ provider: source.provider, url: shop.url, error: error.message }); }
      completed++;
      if (completed % 10 === 0) console.log(`${source.provider}: ${completed}/${shops.size}ページを取得しました`);
    }
  }
  // 既存の公式URLも今回の応答として取得。過去の台帳を最新の取得結果として流用しない。
  for (const area of Object.keys(areaLabels)) {
    const seedDirectory = new URL(`src/infrastructure/cafes/data/${area}/`, root);
    for (const filename of (await readdir(seedDirectory)).filter((name) => /^\d{3}\.json$/.test(name)).sort()) {
      for (const seed of JSON.parse(await readFile(new URL(filename, seedDirectory), "utf8"))) {
        try {
          const record = extractStore(await fetchPage(seed.sourceUrl), seed.sourceUrl, "official", new Date().toISOString(), seed.name);
          if (record.area) observations.push(record);
          else excluded.push({ provider: "official", url: seed.sourceUrl, name: seed.name, reason: "今回の応答から住所を抽出できず保留" });
        } catch (error) { errors.push({ provider: "official", url: seed.sourceUrl, error: error.message }); }
      }
    }
  }
  const records = mergeObservations(observations);
  const areas = {};
  for (const area of Object.keys(areaLabels)) {
    const entries = records.filter((record) => record.area === area);
    const areaDirectory = new URL(`${area}/`, directory);
    await mkdir(areaDirectory, { recursive: true });
    const chunks = chunkRecords(entries);
    const files = [];
    for (const [index, chunk] of chunks.entries()) {
      const name = `${String(index + 1).padStart(3, "0")}.json`;
      await writeFile(new URL(name, areaDirectory), JSON.stringify(chunk, null, 2) + "\n");
      files.push(`${area}/${name}`);
    }
    areas[area] = { count: entries.length, closed: entries.filter((record) => record.businessStatus === "closed").length,
      unknown: entries.filter((record) => record.businessStatus === "unknown").length, files };
  }
  const manifest = { schemaVersion: 1, runId, startedAt, completedAt: new Date().toISOString(),
    complete: errors.length === 0, chunkSize: 100, count: records.length, observationCount: observations.length,
    areas, discovery, errors, excluded,
    limitations: ["収集対象サイトの検索結果であり地域の全店舗保証ではない", "掲載ページだけでは営業継続を確認できない", "SNSは店舗ページからリンクを収集。投稿API未接続", "雑誌の紙面・電子書籍本文は未取得", "取得結果を地図用の公開台帳へ自動反映しない"] };
  await writeFile(new URL("manifest.json", directory), JSON.stringify(manifest, null, 2) + "\n");
  const escape = (value) => String(value ?? "").replace(/[|\r\n]/g, " ");
  let summary = `# 最新の店舗情報取得結果\n\n取得完了（日本時間）：${new Date(manifest.completedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}\n\n${records.length}候補 / ${observations.length}取得レコード / 取得エラー${errors.length}件。営業確認済み件数ではありません。\n`;
  for (const area of Object.keys(areaLabels)) {
    summary += `\n## ${areaLabels[area]}：${areas[area].count}候補\n\n| 店舗名 | 住所 | 状態 | 取得元 |\n| --- | --- | --- | --- |\n`;
    for (const record of records.filter((record) => record.area === area)) summary += `| ${escape(record.name)} | ${escape(record.address)} | ${record.businessStatus === "closed" ? "閉店表示あり・非公開" : "営業未確認・非公開"} | ${record.sources.map((source) => `[${source.provider}](${source.url})`).join(" / ")} |\n`;
  }
  summary += "\n取得結果は候補です。閉店・移転・営業継続の確認と重複照合を経て公開します。SNS投稿と雑誌本文は今回取得していません。\n";
  await writeFile(new URL("summary.md", directory), summary);
  const latest = new URL("data/collections/latest.json", root);
  const temporary = new URL(`data/collections/latest-${runId}.tmp`, root);
  await writeFile(temporary, JSON.stringify({ runId, manifest: `${runId}/manifest.json`, summary: `${runId}/summary.md` }, null, 2) + "\n");
  await rename(temporary, latest);
  console.log(JSON.stringify({ runId, count: records.length, areas, errors: errors.length, summary: fileURLToPath(new URL("summary.md", directory)) }, null, 2));
  if (errors.length) process.exitCode = 1;
  return manifest;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCollection().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
