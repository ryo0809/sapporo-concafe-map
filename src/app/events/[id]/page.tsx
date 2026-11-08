import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getD1 } from "@/infrastructure/database/d1";
import type { EventBanner } from "@/domain/events/banner";
import { SiteFooter } from "@/presentation/site/footer";
import Image from "next/image";
export const metadata={title:"イベント詳細",robots:{index:false,follow:false}};
export default async function EventPage({params}:{params:Promise<{id:string}>}){
  await connection();const {id}=await params,now=new Date().toISOString();
  const banner=await(await getD1()).prepare("SELECT * FROM event_banners WHERE id=? AND published=1 AND destination='detail' AND starts_at<=? AND ends_at>?").bind(id,now,now).first<EventBanner>();
  if(!banner)notFound();
  return <><main className="information-page event-detail"><Link href="/">← マップに戻る</Link><h1>{banner.title}</h1><Image unoptimized src={banner.image_url} alt="" width={1200} height={300}/><div className="event-detail-text">{banner.detail_text}</div></main><SiteFooter/></>;
}
