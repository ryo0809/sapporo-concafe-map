import { createListCafes } from "@/composition/cafes";
import { CafeMap } from "@/presentation/cafes/cafe-map";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";

export default function Home() {
  return (
    <main>
      <header className="site-header"><Link className="brand" href="/">SAPPORO <span>CONCAFE MAP</span></Link><span className="area-label">札幌 / 狸小路・すすきの</span></header>
      <div className="hero"><p className="eyebrow">FIND YOUR FAVORITE PLACE</p><h1>札幌で、気になるお店に<br />出会おう。</h1><p>狸小路・すすきののコンカフェとメイドカフェを、地図から探す。</p></div>
      <Suspense fallback={<p role="status">最新の店舗データを読み込んでいます…</p>}><LatestCafeMap /></Suspense>
      <footer>掲載情報は一部の店舗です。営業時間・営業状況は各店舗の公式サイトでご確認ください。</footer>
    </main>
  );
}

async function LatestCafeMap() {
  await connection();
  const cafes = await createListCafes().execute();
  return <CafeMap cafes={cafes} />;
}
