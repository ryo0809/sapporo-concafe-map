import Link from "next/link";
import type { EventBanner as Banner } from "@/domain/events/banner";
import Image from "next/image";
export function EventBanner({banner}:{banner:Banner}){
  const image=<Image unoptimized src={banner.image_url} alt={banner.title} width={1200} height={300} loading="lazy"/>;
  const target=banner.destination==="detail"?`/events/${banner.id}`:banner.destination==="external"?banner.external_url:null;
  return <section className="event-banner" aria-label="開催中のイベント"><p>開催中のイベント</p>{target?banner.destination==="external"?<a href={target} target="_blank" rel="noopener noreferrer">{image}<span>{banner.title} ↗</span></a>:<Link href={target}>{image}<span>{banner.title} →</span></Link>:<div>{image}<span>{banner.title}</span></div>}</section>;
}
