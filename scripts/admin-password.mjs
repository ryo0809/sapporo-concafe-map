import {randomUUID} from "node:crypto";
import {writeFileSync,unlinkSync} from "node:fs";
import {hashPassword} from "../db/passwords.mjs";
import {wrangler,sqlValue,reportPath,remoteEnvironment} from "./lib/wrangler.mjs";

const args=process.argv.slice(2),username=process.env.ADMIN_USERNAME??"admin",password=process.env.ADMIN_NEW_PASSWORD;
if(!password||password.length<16||password.length>256||password.trim()!==password||password.toLowerCase().includes("adminadmin"))throw new Error("ADMIN_NEW_PASSWORDに16〜256文字の本番用パスワードを設定してください。引数やログには含めないでください。");
if(!username.trim()||username.length>100)throw new Error("ADMIN_USERNAMEが不正です。");
let mode;
if(args.includes("--remote")){const {environment}=remoteEnvironment(args);mode=["--remote","--env",environment];}
else if(args.includes("--local"))mode=["--local","--persist-to",process.env.D1_PERSIST_PATH||".wrangler/state"];
else throw new Error("--local または --remote --env ... を明示してください。");
const filename=reportPath(`reports/admin-password-${randomUUID()}.sql`);
try{
  const name=sqlValue(username);
  writeFileSync(filename,`INSERT INTO administrators(id,username,password_hash) VALUES(${sqlValue(randomUUID())},${name},${sqlValue(hashPassword(password))}) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash;\nDELETE FROM sessions WHERE admin_id=(SELECT id FROM administrators WHERE username=${name});\nDELETE FROM login_attempts WHERE username=${name};\n`,{mode:0o600,flag:"wx"});
  wrangler(["d1","execute","DB",...mode,"--file",filename,"--json"],{json:true});
  console.log("管理者パスワードを設定し、既存のログインセッションを失効しました。");
}finally{try{unlinkSync(filename);}catch{/* No password material is printed. */}}
