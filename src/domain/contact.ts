export const contactCategories = { correction: "掲載情報の修正", deletion: "掲載情報の削除", addition: "掲載店舗の追加", site: "サイトに対する要望・追加", other: "その他" };
export type ContactCategory = keyof typeof contactCategories;
export const isStoreContact = (category: ContactCategory) => ["correction", "deletion", "addition"].includes(category);
export const contactFields = {
  correction: { label: "補足", hint: "修正について補足があればお知らせください。" },
  deletion: { label: "補足", hint: "削除について補足があればお知らせください。" },
  addition: { label: "補足", hint: "各項目以外に掲載に必要な情報があればお知らせください。" },
  site: { label: "補足", hint: "要望について補足があればお知らせください。" },
  other: { label: "お問い合わせ内容", hint: "お問い合わせの内容をお知らせください。" },
};
type DetailField = { key: string; label: string; max: number; required?: boolean; multiline?: boolean; type?: "url"; placeholder?: string };
export const contactDetailFields: Record<ContactCategory, DetailField[]> = {
  correction: [
    { key: "correctionItem", label: "修正する項目", max: 200, required: true, placeholder: "例：営業時間、住所、店舗名" },
    { key: "currentValue", label: "現在の掲載内容", max: 2000, multiline: true },
    { key: "correctValue", label: "正しい内容", max: 2000, required: true, multiline: true },
  ],
  deletion: [
    { key: "deletionTarget", label: "削除を希望する情報", max: 1000, required: true, placeholder: "例：店舗全体、掲載されているURL" },
    { key: "deletionReason", label: "削除の理由", max: 2000, required: true, multiline: true },
  ],
  addition: [
    { key: "address", label: "住所", max: 300, required: true },
    { key: "building", label: "ビル・建物名", max: 200 },
    { key: "floor", label: "階数", max: 50, placeholder: "例：3F" },
    { key: "businessType", label: "業態", max: 100, placeholder: "例：メイドカフェ、コンカフェ" },
    { key: "openingHours", label: "営業時間", max: 300, multiline: true },
    { key: "closedDays", label: "定休日", max: 200 },
  ],
  site: [
    { key: "subject", label: "要望の件名", max: 200, required: true },
    { key: "sitePageUrl", label: "対象ページURL", type: "url", max: 2048 },
    { key: "currentIssue", label: "現在困っていること", max: 2000, multiline: true },
    { key: "requestedChange", label: "改善・追加してほしいこと", max: 3000, required: true, multiline: true },
  ],
  other: [{ key: "subject", label: "件名", max: 200, required: true }],
};
export const contactUrlFields: DetailField[] = [
  { key: "officialUrl", label: "公式サイトURL", type: "url", max: 2048 },
  { key: "xUrl", label: "X（旧Twitter）URL", type: "url", max: 2048 },
  { key: "instagramUrl", label: "Instagram URL", type: "url", max: 2048 },
  { key: "tiktokUrl", label: "TikTok URL", type: "url", max: 2048 },
  { key: "facebookUrl", label: "Facebook URL", type: "url", max: 2048 },
  { key: "youtubeUrl", label: "YouTube URL", type: "url", max: 2048 },
  { key: "lineUrl", label: "LINE公式アカウントURL", type: "url", max: 2048 },
];
export type ContactMessage = { id: string; name: string; email: string; category: ContactCategory; store_name: string; reference_url: string; details_json: string; message: string; status: "new" | "done"; created_at: string };
export function validateContact(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("入力内容を確認してください。");
  const data = value as Record<string, unknown>;
  function text(key: string, max: number, required = false) {
    const v = data[key];
    if (v === undefined && !required) return "";
    if (typeof v !== "string" || v.trim().length > max || (required && !v.trim())) throw new Error("必須項目と文字数を確認してください。");
    return v.trim();
  }
  const id = text("id", 36, true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("ページを再読み込みして送信してください。");
  const name = text("name", 100, true), email = text("email", 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("メールアドレスを確認してください。");
  const category = text("category", 20) as ContactCategory;
  if (!Object.hasOwn(contactCategories, category)) throw new Error("お問い合わせの種類を選択してください。");
  const storeName = isStoreContact(category) ? text("storeName", 200, true) : "";
  const details: Record<string, string> = {};
  for (const field of [...contactDetailFields[category], ...(isStoreContact(category) ? contactUrlFields : [])]) {
    const value = text(field.key, field.max, field.required);
    if (field.type === "url" && value) {
      let url: URL;
      try { url = new URL(value); } catch { throw new Error(`${field.label}を確認してください。`); }
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error(`${field.label}はhttpまたはhttpsで入力してください。`);
    }
    if (value) details[field.key] = value;
  }
  const referenceUrl = isStoreContact(category) ? text("referenceUrl", 2048) : "";
  if (referenceUrl) {
    let url: URL;
    try { url = new URL(referenceUrl); } catch { throw new Error("確認用URLを確認してください。"); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("確認用URLはhttpまたはhttpsで入力してください。");
  }
  if (data.consent !== true) throw new Error("プライバシーポリシーへの同意が必要です。");
  return { id, name, email, category, storeName, referenceUrl, details, message: text("message", 5000, category === "other"), website: text("website", 200) };
}
