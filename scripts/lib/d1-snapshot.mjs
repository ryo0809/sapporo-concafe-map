import {createHash} from "node:crypto";
import {sqlValue} from "./wrangler.mjs";

// Dependency order. Authentication and transient rate-limit data are deliberately excluded.
export const tables=["buildings","floors","cafes","cafe_history","collection_runs","collected_candidates","search_candidates","import_records"];
export const identifier=value=>{if(!/^[a-z_]+$/.test(value))throw new Error("不正な列名です。");return `"${value}"`;};
export function canonicalRows(rows){return rows.map(row=>Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
export const tableDigest=rows=>createHash("sha256").update(JSON.stringify(canonicalRows(rows))).digest("hex");
export function createSnapshot(database){
  const data=Object.fromEntries(tables.map(table=>[table,{
    columns:database.prepare(`PRAGMA table_info(${identifier(table)})`).all().map(column=>({name:column.name,type:column.type})),
    rows:database.prepare(`SELECT * FROM ${identifier(table)}`).all(),
  }]));
  const payload={format:1,createdAt:new Date().toISOString(),source:"local D1",tables:data};
  return {...payload,checksum:createHash("sha256").update(JSON.stringify(payload)).digest("hex")};
}
export function validateSnapshot(snapshot){
  const {checksum,...payload}=snapshot;
  if(payload.format!==1||createHash("sha256").update(JSON.stringify(payload)).digest("hex")!==checksum)throw new Error("スナップショットの形式またはチェックサムが不正です。");
  if(Object.keys(payload.tables).sort().join()!==[...tables].sort().join())throw new Error("同期テーブルが不正です。");
  for(const table of tables){
    const {columns,rows}=payload.tables[table];
    if(!columns.length||!Array.isArray(rows))throw new Error("テーブル情報が不正です。");
    columns.forEach(column=>identifier(column.name));
    for(const row of rows){
      if(Object.keys(row).sort().join()!==columns.map(column=>column.name).sort().join())throw new Error("列とデータが一致しません。");
      Object.values(row).forEach(sqlValue);
    }
  }
  return snapshot;
}
export function snapshotSql(snapshot){
  validateSnapshot(snapshot);
  return tables.flatMap(table=>snapshot.tables[table].rows.map(row=>`INSERT INTO ${identifier(table)}(${Object.keys(row).map(identifier).join(",")}) VALUES(${Object.values(row).map(sqlValue).join(",")});`)).join("\n")+"\n";
}
export function snapshotSummary(snapshot){return Object.fromEntries(tables.map(table=>[table,{count:snapshot.tables[table].rows.length,digest:tableDigest(snapshot.tables[table].rows)}]));}
