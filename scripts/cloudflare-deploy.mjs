import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import {remoteEnvironment} from "./lib/wrangler.mjs";
import {checkRelease} from "./lib/production-check.mjs";

const args=process.argv.slice(2);
const {environment}=remoteEnvironment(args);
const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
if(environment==="production"){
  const errors=checkRelease(config);
  if(errors.length)throw new Error(errors.join("\n"));
}
const env={...process.env,SITE_INDEXABLE:environment==="production"?"true":"false"};
for (const command of ["build", "deploy"]) {
  const result = spawnSync(process.execPath, ["node_modules/@opennextjs/cloudflare/dist/cli/index.js", command,"--env",environment], { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
