"use client";

import { useCallback, useEffect, useState } from "react";
import type { CafeSummary } from "@/application/cafes/list-cafes";
import { addressFloor, cafeAddress } from "@/domain/cafes/building-address";
import { CafeMap } from "./cafe-map";

type PublicCafeRecord = CafeSummary & { tenantAddress?: string; floor?: string | null };
type Result = { cafes: PublicCafeRecord[] };

export function PublicCafeMap() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setError(false); setAttempt(value => value + 1); }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/cafes", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Public cafes unavailable");
        const data = await response.json() as Result;
        if (!Array.isArray(data.cafes)) throw new Error("Invalid public cafes response");
        return { cafes: data.cafes.map(cafe => ({ ...cafe,
          address: cafeAddress(cafe.address, cafe.buildingName, cafe.floor ?? addressFloor(cafe.tenantAddress ?? cafe.address)),
        })) };
      })
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);

  if (error) return <p role="alert">店舗データを読み込めませんでした。<button onClick={retry}>再読み込み</button></p>;
  if (!result) return <p role="status">最新の店舗データを読み込んでいます…</p>;
  return <CafeMap cafes={result.cafes} />;
}
