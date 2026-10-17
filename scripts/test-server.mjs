import { spawnSync,spawn } from "node:child_process";
const setup=spawnSync(process.execPath,["scripts/d1-setup.mjs","--local","--from-json"],{stdio:"inherit",env:process.env});
if(setup.status!==0)process.exit(setup.status??1);
const child=spawn(process.execPath,["node_modules/wrangler/bin/wrangler.js","dev","--ip","127.0.0.1","--port","3100","--local","--persist-to",process.env.D1_PERSIST_PATH,"--var","SESSION_COOKIE_SECURE:false"],{stdio:"inherit",env:{...process.env,WRANGLER_SEND_METRICS:"false"}});
process.on("SIGTERM",()=>child.kill());process.on("SIGINT",()=>child.kill());child.on("exit",(code)=>process.exit(code??0));
