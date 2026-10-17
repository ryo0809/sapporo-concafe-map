import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
if (config.d1_databases[0].database_id === "00000000-0000-0000-0000-000000000000") {
  throw new Error("D1のdatabase_idが未設定です。docs/cloudflare-d1.mdの手順で本番DBを準備してください。");
}
for (const command of ["build", "deploy"]) {
  const result = spawnSync(process.execPath, ["node_modules/@opennextjs/cloudflare/dist/cli/index.js", command], { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
