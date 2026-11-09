import { readFileSync } from 'node:fs';

const target = process.env.TARGET_ENV;
if (!['staging', 'production'].includes(target)) throw new Error('TARGET_ENV must be staging or production');

const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const worker = config.env?.[target];
const sender = worker?.vars?.MAIL_FROM;
if (!worker?.send_email?.some((binding) => binding.name === 'EMAIL')) {
  throw new Error(`${target} Worker に EMAIL の send_email binding がありません`);
}
if (sender !== 'noreply@sapporo-concafe-map.com') {
  throw new Error(`${target} Worker の MAIL_FROM を確認してください`);
}
console.log(`${target} Worker のメール binding と送信元設定を確認しました`);
