export const site = {
  name: "札幌コンカフェマップ",
  url: "https://sapporo-concafe-map.com",
  description: "札幌・すすきの・狸小路のコンカフェとメイドカフェを、地図やビル・階から探せる店舗マップ。",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  indexable: process.env.SITE_INDEXABLE === "true",
};
