import { spawnSync } from 'node:child_process';

const target = process.env.TARGET_ENV;
if (!['staging', 'production'].includes(target)) throw new Error('TARGET_ENV must be staging or production');

const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'list', '--env', target, '--format', 'json'], { encoding: 'utf8', env: process.env });
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  throw new Error(`${target} Worker の Secret 一覧を取得できませんでした`);
}

let secrets;
try {
  secrets = JSON.parse(result.stdout);
} catch {
  throw new Error('Wrangler の Secret 一覧を解析できませんでした');
}
if (!Array.isArray(secrets)) throw new Error('Wrangler の Secret 一覧が不正です');

const names = new Set(secrets.map((secret) => secret.name));
const missing = ['RESEND_API_KEY', 'MAIL_FROM'].filter((name) => !names.has(name));
if (missing.length) throw new Error(`${target} Worker にメール送信用 Secret がありません: ${missing.join(', ')}`);
console.log(`${target} Worker のメール送信用 Secret 名を確認しました`);
