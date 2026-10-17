export const contactCategories = { correction: "掲載情報の修正", deletion: "掲載情報の削除", addition: "掲載店舗の追加", site: "サイトに対する要望・追加", other: "その他" };
export type ContactCategory = keyof typeof contactCategories;
export const isStoreContact = (category: ContactCategory) => ["correction", "deletion", "addition"].includes(category);
export const contactFields = {
  correction: { label: "修正内容", hint: "修正する項目と、現在の掲載内容・正しい内容をお知らせください。" },
  deletion: { label: "削除の理由・内容", hint: "削除を希望する掲載情報と、その理由をお知らせください。" },
  addition: { label: "掲載店舗の情報", hint: "住所、業態、営業時間など、掲載を希望する店舗の情報をお知らせください。" },
  site: { label: "要望・追加してほしい機能", hint: "改善してほしい点や、追加してほしい機能を具体的にお知らせください。" },
  other: { label: "お問い合わせ内容", hint: "お問い合わせの内容をお知らせください。" },
};
export type ContactMessage = { id: string; name: string; email: string; category: ContactCategory; store_name: string; reference_url: string; message: string; status: "new" | "done"; created_at: string };
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
  const referenceUrl = isStoreContact(category) ? text("referenceUrl", 2048) : "";
  if (referenceUrl) {
    let url: URL;
    try { url = new URL(referenceUrl); } catch { throw new Error("確認用URLを確認してください。"); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("確認用URLはhttpまたはhttpsで入力してください。");
  }
  if (data.consent !== true) throw new Error("プライバシーポリシーへの同意が必要です。");
  return { id, name, email, category, storeName, referenceUrl, message: text("message", 5000, true), website: text("website", 200) };
}
