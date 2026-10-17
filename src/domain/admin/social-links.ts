export const socialPlatforms={x:"X",instagram:"Instagram",tiktok:"TikTok",facebook:"Facebook",youtube:"YouTube",line:"LINE",other:"その他のSNS"};
export type SocialPlatform=keyof typeof socialPlatforms;
export type SocialFields=Record<SocialPlatform,string>;
export function socialPlatform(value:string):SocialPlatform{
  let host:string;try{host=new URL(value).hostname.toLowerCase().replace(/^www\./,"");}catch{return "other";}
  const matches=(domain:string)=>host===domain||host.endsWith("."+domain);
  if(matches("x.com")||matches("twitter.com"))return "x";
  if(matches("instagram.com"))return "instagram";
  if(matches("tiktok.com"))return "tiktok";
  if(matches("facebook.com")||matches("fb.com"))return "facebook";
  if(matches("youtube.com")||matches("youtu.be"))return "youtube";
  if(matches("line.me")||matches("lin.ee"))return "line";
  return "other";
}
export function socialFields(urls:readonly string[]):SocialFields{
  const fields:SocialFields={x:"",instagram:"",tiktok:"",facebook:"",youtube:"",line:"",other:""};
  for(const url of urls){const key=socialPlatform(url);fields[key]+=(fields[key]?"\n":"")+url;}
  return fields;
}
export function socialUrls(fields:SocialFields):string[]{return Object.values(fields).flatMap(value=>value.split(/\r?\n/).map(url=>url.trim()).filter(Boolean));}
