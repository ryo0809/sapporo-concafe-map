"use client";

import {useEffect, useRef} from "react";
import {usePathname} from "next/navigation";
import {track} from "./track";

export function PageAnalytics() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    track("page_view", {source: "page"});
  }, [pathname]);
  return null;
}
