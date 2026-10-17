import { spawn } from "node:child_process";

const child = spawn(process.execPath, [
  "node_modules/@opennextjs/cloudflare/dist/cli/index.js", "preview",
  "--persist-to", process.env.D1_PERSIST_PATH || ".wrangler/state",
  ...process.argv.slice(2),
], { stdio: "inherit", env: process.env });
process.on("SIGTERM", () => child.kill());
process.on("SIGINT", () => child.kill());
child.on("exit", code => process.exit(code ?? 0));
