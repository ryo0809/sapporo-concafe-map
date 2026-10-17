import {readFileSync} from "node:fs";
import {checkRelease} from "./lib/production-check.mjs";
const errors=checkRelease(JSON.parse(readFileSync("wrangler.jsonc","utf8")));
if(errors.length){console.error(errors.map(error=>`- ${error}`).join("\n"));process.exitCode=1;}
else console.log("静的な本番設定チェックが成功しました。ドメイン取得・権利者確認・DB照合・復旧確認・レビュー承認は別途必要です。");
