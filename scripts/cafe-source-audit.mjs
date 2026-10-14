import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extractBusinesses } from "../batch/lib/extract-businesses.mjs";
import robotsParser from "robots-parser";

/** JSON-LDは候補として抽出する。業態・営業状況・エリアを自動確定しない。 */
async function main() {
  const catalog = [];
  for (const area of ["tanukikoji", "susukino"]) {
    const directory = new URL(`../src/infrastructure/cafes/data/${area}/`, import.meta.url);
    for (const file of (await readdir(directory)).filter((name) => /^\d{3,}\.json$/.test(name)).sort()) {
      catalog.push(...JSON.parse(await readFile(new URL(file, directory), "utf8")));
    }
  }
  const report = [];
  const robots = new Map();
  const userAgent = "sapporo-concafe-map-source-audit/1.0 (+https://github.com/ryo0809/sapporo-concafe-map)";
  for (const sourceUrl of new Set(catalog.map((cafe) => cafe.sourceUrl))) {
    const records = catalog.filter((cafe) => cafe.sourceUrl === sourceUrl);
    try {
      const origin = new URL(sourceUrl).origin;
      if (!robots.has(origin)) {
        const robotsUrl = `${origin}/robots.txt`;
        const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": userAgent } });
        if (!response.ok && response.status !== 404) throw new Error(`robots.txt HTTP ${response.status}`);
        robots.set(origin, robotsParser(robotsUrl, response.status === 404 ? "" : await response.text()));
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (robots.get(origin).isAllowed(sourceUrl, userAgent) === false) {
        report.push({ sourceUrl, status: "robots-blocked" });
        continue;
      }
      const response = await fetch(sourceUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": userAgent },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const extracted = extractBusinesses(await response.text());
      report.push({ sourceUrl, checkedAt: new Date().toISOString(), status: "needs-review",
        published: records.map(({ id, name, address, location, verifiedOn }) => ({ id, name, address, location, verifiedOn })),
        ...extracted });
    } catch (error) {
      report.push({ sourceUrl, status: "fetch-failed", error: error.message });
    }
    // 連続アクセスを抑制。失敗時に再試行や別サイトへの巡回はしない。
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const directory = new URL("../reports/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("cafe-source-audit.json", directory), JSON.stringify(report, null, 2) + "\n");
  console.log(`${report.length}件の確認元を調査しました。reports/cafe-source-audit.json を確認してください。`);
  console.log("台帳・確認日は変更していません。抽出結果は公開前に目視確認してください。");
  if (report.some((entry) => entry.status === "fetch-failed")) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
