import { socialPlatform, socialPlatforms, type SocialPlatform } from "@/domain/admin/social-links";

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const paths: Record<SocialPlatform, React.ReactNode> = {
    x: <path d="m4 3 12.5 18H20L7.5 3H4Zm0 18 6.3-7.3M13.7 10.3 20 3"/>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></>,
    tiktok: <path d="M14 3v12a4 4 0 1 1-4-4M14 3c0 4 3 6 6 6M14 3h3"/>,
    facebook: <path d="M14 21v-8h3l.5-4H14V7c0-1 .5-2 2-2h2V2h-3c-3 0-5 2-5 5v2H7v4h3v8"/>,
    youtube: <><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/></>,
    line: <><path d="M21 10c0 5-5 8-11 11l1-4C6 17 3 14 3 10c0-4 4-7 9-7s9 3 9 7Z"/><path d="M7 8v4h2m2-4v4m3-4v4h3"/></>,
    other: <><path d="m10 13 4-4M8 15l-1 1a3.5 3.5 0 0 1-5-5l5-5a3.5 3.5 0 0 1 5 0m0 12a3.5 3.5 0 0 0 5 0l5-5a3.5 3.5 0 0 0-5-5l-1 1"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[platform]}</svg>;
}

export function SocialLinks({ urls, cafeName }: { urls: readonly string[]; cafeName: string }) {
  const links = [...new Set(urls.map(url => url.trim()))].filter(url => {
    try { return ["https:", "http:"].includes(new URL(url).protocol); } catch { return false; }
  });
  if (!links.length) return null;
  return <nav className="cafe-social-links" aria-label={`${cafeName}のSNS`}>
    {links.map(url => {
      const platform = socialPlatform(url), label = socialPlatforms[platform];
      return <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${label}（別タブで開く）`} title={`${label}（別タブで開く）`}><SocialIcon platform={platform}/></a>;
    })}
  </nav>;
}
