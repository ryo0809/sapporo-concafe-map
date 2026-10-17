import {readFileSync,writeFileSync} from "node:fs";
import {wrangler,valueAfter,remoteEnvironment,reportPath} from "./lib/wrangler.mjs";
import {validateSnapshot,snapshotSql,snapshotSummary,tables,identifier,tableDigest} from "./lib/d1-snapshot.mjs";

const args=process.argv.slice(2),filename=valueAfter(args,"--snapshot");
if(!filename)throw new Error("--snapshot reports/snapshots/xxx.json を指定してください。");
const snapshot=validateSnapshot(JSON.parse(readFileSync(filename,"utf8")));
const output=reportPath(valueAfter(args,"--output")??`reports/snapshots/import-${snapshot.checksum.slice(0,12)}.sql`);
writeFileSync(output,snapshotSql(snapshot),{mode:0o600});
console.log(JSON.stringify({prepared:output,checksum:snapshot.checksum,tables:snapshotSummary(snapshot)},null,2));
// Preparation is the default: no remote reads or writes without explicit application.
if(args.includes("--apply")){
  if(!args.includes("--remote"))throw new Error("適用には --remote が必要です。");
  const {environment}=remoteEnvironment(args);
  const mode=["--remote","--env",environment];
  const execute=command=>wrangler(["d1","execute","DB",...mode,"--command",command,"--json"],{json:true});
  for(const table of tables){
    const [columns]=execute(`PRAGMA table_info(${identifier(table)})`);
    if(JSON.stringify(columns.results.map(column=>({name:column.name,type:column.type})))!==JSON.stringify(snapshot.tables[table].columns))throw new Error(`${table}:スキーマが一致しません。マイグレーションを確認してください。`);
    const [count]=execute(`SELECT COUNT(*) AS count FROM ${identifier(table)}`);
    if(count.results[0].count!==0)throw new Error(`${table}:移行先にデータがあります。自動上書きしません。初回同期専用です。`);
  }
  const backup=reportPath(`reports/snapshots/${environment}-before-sync-${Date.now()}.sql`);
  wrangler(["d1","export","DB",...mode,"--output",backup]);
  console.log(`適用前バックアップ: ${backup}（認証情報を含む場合があります。安全な場所で保管してください）`);
  wrangler(["d1","execute","DB",...mode,"--file",output,"--yes"]);
  for(const table of tables){
    const [data]=execute(`SELECT * FROM ${identifier(table)}`);
    if(tableDigest(data.results)!==tableDigest(snapshot.tables[table].rows))throw new Error(`${table}:同期後の照合に失敗しました。再適用せずバックアップから復旧してください。`);
  }
  console.log("全同期テーブルの件数・内容照合に成功しました。管理者パスワードを別途設定してください。");
}
