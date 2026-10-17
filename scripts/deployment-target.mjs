import {remoteEnvironment} from "./lib/wrangler.mjs";
const {environment,target}=remoteEnvironment(process.argv.slice(2));
if(target.vars?.APP_ENV!==environment||target.vars?.SESSION_COOKIE_SECURE!=="true")throw new Error("配置先の環境・Secure Cookie設定が不正です。");
console.log(`配置先設定を確認しました: ${environment} / ${target.name}`);
