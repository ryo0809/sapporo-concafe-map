import { createListCafes } from "@/composition/cafes";
import { CafeMap } from "@/presentation/cafes/cafe-map";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { SiteFooter } from "@/presentation/site/footer";
import { site } from "@/config/site";

export const metadata = { alternates: { canonical: "/" }, openGraph: {url:site.url,type:"website",locale:"ja_JP",siteName:site.name,title:site.name,description:site.description,images:[{url:"/social-card.png",width:1200,height:630,alt:site.name}]} };

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="さっぽろ コンカフェマップ ホーム">
          <svg className="brand-jellyfish" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <path d="M9 25a15 15 0 0 1 30 0c-3 3-6 3-9 1-4 3-8 3-12 0-3 2-6 2-9-1Z" fill="#dce5df" stroke="#71847a" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M16 30c-4 5 4 7 0 12m8-12c4 4-4 7 0 12m8-12c-4 5 4 7 0 12" fill="none" stroke="#71847a" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M16 19c1-3 3-5 6-6" fill="none" stroke="#f9fbf9" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="brand-copy"><small>さっぽろ</small><strong>コンカフェマップ</strong></span>
        </Link>
        <span className="area-label">狸小路・すすきの</span>
      </header>
      <Suspense fallback={<p role="status">最新の店舗データを読み込んでいます…</p>}><LatestCafeMap /></Suspense>
      <SiteFooter />
    </main>
  );
}

async function LatestCafeMap() {
  await connection();
  const cafes = await createListCafes().execute();
  return <CafeMap cafes={cafes} />;
}
