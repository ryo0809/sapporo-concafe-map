import {spawnSync} from "node:child_process";
import {mkdirSync,readFileSync} from "node:fs";
import path from "node:path";
import {parseWranglerJson,redactWranglerOutput} from "./wrangler-output.mjs";

export const domain="sapporo-concafe-map.com";
export function valueAfter(args,key){const index=args.indexOf(key);return index<0?undefined:args[index+1];}
export function remoteEnvironment(args){
  const environment=valueAfter(args,"--env");
  if(!["staging","production"].includes(environment))throw new Error("--env staging または --env production を明示してください。");
  const config=JSON.parse(readFileSync("wrangler.jsonc","utf8"));
  const target=config.env?.[environment];
  const id=target?.d1_databases?.find(db=>db.binding==="DB")?.database_id;
  if(!id||! /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)||id==="00000000-0000-0000-0000-000000000000")throw new Error(`${environment}用D1のdatabase_idを設定してください。`);
  if(valueAfter(args,"--confirm-domain")!==domain)throw new Error(`リモート変更には --confirm-domain ${domain} が必要です。`);
  return {environment,target,config};
}
export function wrangler(args,{json=false}={}){
  mkdirSync("reports/wrangler",{recursive:true});
  const result=spawnSync(process.execPath,["node_modules/wrangler/bin/wrangler.js",...args],{
    env:{...process.env,CI:"true",WRANGLER_SEND_METRICS:"false",WRANGLER_LOG_PATH:path.resolve("reports/wrangler")},encoding:"utf8",maxBuffer:64*1024*1024,
  });
  if(result.status!==0)throw new Error(`Wrangler処理に失敗しました。${redactWranglerOutput(result.stderr||result.error?.message||"")}`);
  if(json)return parseWranglerJson(result.stdout);
  if(result.stdout)process.stdout.write(redactWranglerOutput(result.stdout));
}
export function reportPath(filename){
  const root=path.resolve("reports"),resolved=path.resolve(filename);
  if(!resolved.startsWith(root+path.sep))throw new Error("機密情報を含む出力先はreports/配下にしてください。");
  mkdirSync(path.dirname(resolved),{recursive:true});
  return resolved;
}
export function sqlValue(value){
  if(value===null)return "NULL";
  if(typeof value==="number"&&Number.isFinite(value))return String(value);
  if(typeof value!=="string")throw new Error("不正なSQL値です。");
  return `'${value.replaceAll("'","''")}'`;
}
