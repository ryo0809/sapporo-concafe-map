const domain = 'sapporo-concafe-map.com';
const mode = process.env.EMAIL_DOMAIN_MODE;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!['inspect', 'onboard'].includes(mode)) throw new Error('EMAIL_DOMAIN_MODE must be inspect or onboard');
if (!token) throw new Error('CLOUDFLARE_API_TOKEN is required');

async function cloudflare(path, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    const codes = body.errors?.map((error) => error.code).join(',') || 'unknown';
    throw new Error(`Cloudflare API returned ${response.status} (code: ${codes})`);
  }
  return body.result;
}

const zones = await cloudflare(`/zones?name=${domain}`);
if (!Array.isArray(zones) || zones.length !== 1 || zones[0].name !== domain) {
  throw new Error(`${domain} の Cloudflare ゾーンを一意に特定できません`);
}
const zoneId = zones[0].id;
const sendingDomains = await cloudflare(`/zones/${zoneId}/email/sending/subdomains`);
if (!Array.isArray(sendingDomains)) throw new Error('Email Sending ドメイン一覧が不正です');
const existing = sendingDomains.find((item) => item.name === domain);
if (existing?.enabled) {
  console.log(`${domain} の Email Sending は有効です`);
} else if (mode === 'inspect') {
  console.log(`${domain} の Email Sending は未設定です`);
} else {
  const result = await cloudflare(`/zones/${zoneId}/email/sending/subdomains`, {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  });
  if (result?.name !== domain || !result.enabled) throw new Error('Email Sending を有効化できませんでした');
  console.log(`${domain} の Email Sending を有効化しました。DNS 認証状態を確認してください`);
}
