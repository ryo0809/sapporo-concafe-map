"use client";
import Link from "next/link";
export default function ErrorPage({retry}:{retry:()=>void}){
  return <main className="information-page" role="alert"><h1>情報を読み込めませんでした</h1><p>しばらくしてから、もう一度お試しください。</p><button onClick={()=>retry()}>再読み込み</button><p><Link href="/">マップに戻る</Link></p></main>;
}
