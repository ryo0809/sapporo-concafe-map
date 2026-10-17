import { spawnSync } from "node:child_process";
import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { prepareD1Import } from "./d1-import.mjs";
import {remoteEnvironment} from "./lib/wrangler.mjs";

const remote = process.argv.includes("--remote");
const prepareOnly = process.argv.includes("--prepare-only");
const migrateOnly = process.argv.includes("--migrate-only");
const remoteTarget=remote?remoteEnvironment(process.argv):null;
await mkdir("reports/wrangler", { recursive: true });
if (!remote) {
  try { await access(".dev.vars"); }
  catch { await copyFile(".dev.vars.example", ".dev.vars"); }
}
const mode = remote ? ["--remote","--env",remoteTarget.environment] : ["--local", "--persist-to", process.env.D1_PERSIST_PATH || ".wrangler/state"];
function wrangler(args, capture = false) {
  const result = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], {
    env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: path.resolve("reports/wrangler") },
    stdio: ["ignore", capture ? "pipe" : "inherit", capture ? "pipe" : "inherit"],
    encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`Wranglerが終了コード${result.status}で失敗しました。${capture ? result.stderr : ""}`);
  return capture ? JSON.parse(result.stdout) : null;
}
if (!prepareOnly) wrangler(["d1", "migrations", "apply", "DB", ...mode]);
if (migrateOnly) process.exit(0);
const { filename, counts } = await prepareD1Import({ fromJson: process.argv.includes("--from-json") });
console.log(JSON.stringify({ importFile: filename, sourceCounts: counts, target: remote ? "remote D1" : "local D1" }, null, 2));
if (!prepareOnly) {
  const results = wrangler(["d1", "execute", "DB", ...mode, "--file", filename, "--json"], true);
  console.log(`D1への取り込みが完了しました（${results.length} SQL文）。既存の掲載情報は保持しています。`);
  const summary = wrangler(["d1", "execute", "DB", ...mode, "--command", "SELECT area,COUNT(*) AS count FROM cafes GROUP BY area; SELECT COUNT(*) AS count FROM collected_candidates;", "--json"], true);
  console.log(JSON.stringify({ databaseCounts: summary.map(result => result.results) }, null, 2));
}
