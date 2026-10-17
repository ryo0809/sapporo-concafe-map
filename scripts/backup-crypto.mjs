import {readFileSync,writeFileSync,unlinkSync} from "node:fs";
import {valueAfter,reportPath} from "./lib/wrangler.mjs";
import {encryptBackup,decryptBackup,validateBackupKey} from "./lib/backup-crypto.mjs";
if(process.argv.includes("--check-key")){
  validateBackupKey(process.env.BACKUP_PUBLIC_KEY??"");
  console.log("バックアップ用公開鍵を確認しました。");
}else{
  const input=valueAfter(process.argv,"--input"),output=valueAfter(process.argv,"--output");
  if(!input||!output)throw new Error("--input と --output をreports/配下で指定してください。");
  const source=reportPath(input),target=reportPath(output);
  if(process.argv.includes("--decrypt"))writeFileSync(target,decryptBackup(JSON.parse(readFileSync(source,"utf8")),process.env.BACKUP_PRIVATE_KEY??""),{flag:"wx",mode:0o600});
  else{
    writeFileSync(target,JSON.stringify(encryptBackup(readFileSync(source),process.env.BACKUP_PUBLIC_KEY??"")),{flag:"wx",mode:0o600});
    unlinkSync(source);
  }
  console.log(`出力しました: ${target}`);
}
