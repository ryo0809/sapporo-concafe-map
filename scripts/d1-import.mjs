import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { readFile, readdir, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const sqlValue = value => value === null ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const initialGuard = "NOT EXISTS(SELECT 1 FROM import_records WHERE source_key='migration:d1-initial')";
const identifier = value => {
  if (!/^[a-z_]+$/.test(value)) throw new Error("SQL識別子が不正です");
  return `"${value}"`;
};

export async function prepareD1Import({ fromJson = false } = {}) {
  await mkdir("reports", { recursive: true });
  let sourcePath = path.resolve(process.env.D1_SQLITE_SOURCE || process.env.DATABASE_PATH || "data/database/sapporo.sqlite");
  try { if (fromJson) throw new Error("JSONから初期データを生成します"); await access(sourcePath); }
  catch {
    if (!fromJson && (process.env.D1_SQLITE_SOURCE || process.env.DATABASE_PATH)) throw new Error(`指定した移行元SQLiteを読み込めません: ${sourcePath}`);
    // Build the same initial dataset without creating or changing the previous development DB.
    sourcePath = path.resolve(`reports/d1-source-${process.pid}-${Date.now()}.sqlite`);
    const setup = spawnSync(process.execPath, ["scripts/db-setup.mjs"], { env: { ...process.env, DATABASE_PATH: sourcePath }, encoding: "utf8" });
    if (setup.status !== 0) throw new Error(`移行元データを準備できませんでした。${setup.stderr}`);
  }
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  const statements = ["-- Generated import: credentials and store data. Keep this file out of Git."];
  const counts = {};
  const tables = ["schema_migrations", "buildings", "floors", "cafes", "administrators", "cafe_history", "collection_runs", "collected_candidates", "search_candidates", "import_records"];
  source.exec("BEGIN");
  try {
    for (const table of tables) {
      const rows = source.prepare(`SELECT * FROM ${identifier(table)}`).all();
      counts[table] = rows.length;
      for (const row of rows) {
        // Initial imports always require an explicit publication decision in admin.
        if (table === "cafes") row.publication_status = "hidden";
        const columns = Object.keys(row).map(identifier).join(",");
        const guard = table === "administrators" ? "1" : initialGuard;
        statements.push(`INSERT OR IGNORE INTO ${identifier(table)}(${columns}) SELECT ${Object.values(row).map(sqlValue).join(",")} WHERE ${guard};`);
      }
    }
  } finally { source.close(); }
  statements.push(`INSERT OR IGNORE INTO import_records(source_key,cafe_id,kind,payload) VALUES('migration:d1-initial',NULL,'migration-complete',${sqlValue(JSON.stringify({ source: sourcePath, importedAt: new Date().toISOString() }))});`);

  // Also archive newer batches on subsequent runs; managed cafes are never overwritten.
  for (const runId of (await readdir("data/collections")).filter(name => /^\d{8}T\d+Z$/.test(name)).sort()) {
    const base = `data/collections/${runId}`;
    const manifest = JSON.parse(await readFile(`${base}/manifest.json`, "utf8"));
    statements.push(`INSERT OR IGNORE INTO collection_runs VALUES(${sqlValue(runId)},${sqlValue(JSON.stringify(manifest))});`);
    for (const area of ["tanukikoji", "susukino"]) {
      for (const file of manifest.areas[area].files) {
        if (!new RegExp(`^${area}/\\d{3,}\\.json$`).test(file)) throw new Error("取得ファイルのパスが不正です");
        for (const record of JSON.parse(await readFile(`${base}/${file}`, "utf8"))) {
          statements.push(`INSERT OR IGNORE INTO collected_candidates VALUES(${sqlValue(runId)},${sqlValue(record.id)},${sqlValue(JSON.stringify(record))});`);
        }
      }
    }
  }
  const filename = path.resolve("reports/d1-import.sql");
  await writeFile(filename, statements.join("\n") + "\n", { mode: 0o600 });
  await writeFile("reports/d1-import-summary.json", JSON.stringify({ source: sourcePath, filename, counts }, null, 2) + "\n");
  return { filename, counts };
}
