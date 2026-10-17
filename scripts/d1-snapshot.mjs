import {DatabaseSync} from "node:sqlite";
import {writeFileSync} from "node:fs";
import path from "node:path";
import {getPlatformProxy} from "wrangler";
import {reportPath,valueAfter} from "./lib/wrangler.mjs";
import {createSnapshot,snapshotSummary} from "./lib/d1-snapshot.mjs";

if(process.argv.includes("--remote"))throw new Error("スナップショットはローカルD1専用です。");
const output=reportPath(valueAfter(process.argv,"--output")??`reports/snapshots/local-${Date.now()}.json`);
const proxy=await getPlatformProxy({persist:{path:path.resolve(process.env.D1_PERSIST_PATH||".wrangler/state","v3")}});
try{
  // Same local-export operation used by Wrangler. Unlike its CLI, the proxy accepts a custom persistence path.
  const dump=await proxy.env.DB.prepare("PRAGMA miniflare_d1_export(?,?,?);").bind(false,false).raw();
  const db=new DatabaseSync(":memory:");
  try{
    db.exec(dump[0].join("\n"));
    const snapshot=createSnapshot(db);
    writeFileSync(output,JSON.stringify(snapshot,null,2)+"\n",{mode:0o600,flag:"wx"});
    console.log(JSON.stringify({output,checksum:snapshot.checksum,tables:snapshotSummary(snapshot)},null,2));
  }finally{db.close();}
}finally{await proxy.dispose();}
