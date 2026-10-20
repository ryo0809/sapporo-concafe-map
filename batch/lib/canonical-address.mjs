// Shared by collection and runtime identity checks; deliberately has no HTML-parser dependency.
export function canonicalAddress(address) {
  return String(address ?? "").normalize("NFKC").replace(/\s+/g, " ").trim()
    .replace(/[一二三四五六七八九]/g, value => String("一二三四五六七八九".indexOf(value) + 1))
    .replace(/北海道|\s/g, "").replace(/[‐−ー－–]/g, "-")
    .replace(/丁目|番地?|号/g, "-").replace(/地下(\d+)(?:階|F)/g, "B$1F").replace(/(\d+)階/g, "$1F").replace(/-+/g, "-");
}
