import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getDatabase, databasePath, hashPassword, listCafes, findCafe, saveCafe } from "../db/runtime.mjs";
import { getBuildingDetails } from "../src/domain/cafes/building-details.ts";

const db = getDatabase();
const username = process.env.ADMIN_USERNAME || "admin";
db.prepare("INSERT OR IGNORE INTO administrators VALUES(?,?,?)").run(randomUUID(),username,hashPassword(process.env.ADMIN_PASSWORD || "admin"));
const base = "data/collections";
const latest = JSON.parse(await readFile(`${base}/latest.json`,"utf8"));
const initialMigration=!db.prepare("SELECT 1 FROM import_records WHERE source_key='migration:initial'").get();
const report = { database: databasePath(), imported: 0, preserved: 0, pendingCandidates:0, archivedCandidates: 0, archivedCatalog: 0, skipped: [], latestRun: latest.runId };
const latestRecords = [];
for (const runId of (await readdir(base)).filter((name)=>/^\d{8}T\d+Z$/.test(name)).sort()) {
  const manifest = JSON.parse(await readFile(`${base}/${runId}/manifest.json`,"utf8"));
  db.prepare("INSERT OR IGNORE INTO collection_runs VALUES(?,?)").run(runId,JSON.stringify(manifest));
  for (const area of ["tanukikoji","susukino"]) {
    for (const file of manifest.areas[area].files) {
      if (!new RegExp(`^${area}/\\d{3,}\\.json$`).test(file)) throw new Error("移行ファイルのパスが不正です");
      const records = JSON.parse(await readFile(`${base}/${runId}/${file}`,"utf8"));
      for (const record of records) {
        report.archivedCandidates += Number(db.prepare("INSERT OR IGNORE INTO collected_candidates VALUES(?,?,?)").run(runId,record.id,JSON.stringify(record)).changes);
        if (runId === latest.runId) latestRecords.push(record);
      }
    }
  }
}
for (const record of latestRecords) {
  try {
    if (findCafe(record.id)) { report.preserved++; continue; }
    if(!initialMigration){report.pendingCandidates++;continue;}
    const source = record.sources.find((entry)=>entry.provider==="official") ?? record.sources[0];
    const building = getBuildingDetails(record.address);
    saveCafe({ name:record.name,address:record.address,area:record.area,category:record.category,
      buildingName:building.key==="unknown" ? "" : building.name,floor:building.floor,location:record.location,
      businessStatus:record.businessStatus,publicationStatus:["closed","temporarily_closed","moved"].includes(record.businessStatus) ? "hidden" : "published",
      sourceUrl:source.url,socialUrls:record.links.filter((link)=>link.kind==="social").map((link)=>link.url),
      fetchedAt:source.fetchedAt,verifiedOn:"",coordinateSource:record.location ? "移行元の取得サイトの構造化データ（位置未確認）" : "座標未取得" },"migration",record.id);
    db.prepare("INSERT OR IGNORE INTO import_records VALUES(?,?,?,?)").run(`latest:${latest.runId}:${record.id}`,record.id,"latest",JSON.stringify(record));
    report.imported++;
  } catch (error) { report.skipped.push({ id:record.id,error:error.message }); }
}
for (const area of ["tanukikoji","susukino"]) {
  const directory=`src/infrastructure/cafes/data/${area}`;
  for (const file of (await readdir(directory)).filter((name)=>/^\d{3,}\.json$/.test(name))) {
    for (const record of JSON.parse(await readFile(`${directory}/${file}`,"utf8"))) {
      const matched=latestRecords.find((candidate)=>candidate.sources.some((source)=>source.url===record.sourceUrl));
      report.archivedCatalog += Number(db.prepare("INSERT OR IGNORE INTO import_records VALUES(?,?,?,?)").run(`catalog:${record.id}`,matched?.id ?? null,"catalog",JSON.stringify(record)).changes);
    }
  }
}
report.total=listCafes().length;
report.published=listCafes(true).length;
if(!report.skipped.length)db.prepare("INSERT OR IGNORE INTO import_records VALUES(?,NULL,?,?)").run("migration:initial","migration-complete",JSON.stringify({runId:latest.runId,count:report.total}));
await mkdir("reports",{recursive:true});
await writeFile("reports/db-migration.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if (report.skipped.length) process.exitCode=1;
