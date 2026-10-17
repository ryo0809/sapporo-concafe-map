export const normalizeSearch=(value:string)=>value.normalize("NFKC").toLowerCase()
  .replace(/[ァ-ヶ]/g,char=>String.fromCharCode(char.charCodeAt(0)-0x60))
  .replace(/[\s\p{P}\p{S}]/gu,"");

export function candidateSearchScore(query:string,name:string,address="",aliases=""):number{
  query=query.replace(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([a-z0-9_]+)(?:[/?#]\S*)?/gi,"$1");
  const normalizedName=normalizeSearch(name),whole=normalizeSearch(query);
  if(!whole)return 0;
  if(normalizedName===whole)return 100;
  if(normalizedName.startsWith(whole))return 90;
  if(normalizedName.includes(whole))return 80;
  const words=query.normalize("NFKC").trim().split(/\s+/).map(normalizeSearch).filter(Boolean);
  const meaningful=words.filter(word=>!["こんかふぇ","めいどかふぇ","公式","公式さいと"].includes(word));
  const terms=meaningful.length?meaningful:words;
  const text=normalizedName+normalizeSearch(address)+normalizeSearch(aliases);
  if(!terms.every(term=>text.includes(term)))return 0;
  return 40+terms.filter(term=>normalizedName.includes(term)).length/terms.length*30;
}
