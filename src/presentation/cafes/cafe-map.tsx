"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { CafeSummary } from "@/application/cafes/list-cafes";

const labels = { concept: "コンカフェ", maid: "メイドカフェ", unknown: "種別未確認" };
type Area = CafeSummary["area"];
const areas: Record<Area, { label: string; bounds: [[number, number], [number, number]] }> = {
  tanukikoji: { label: "狸小路", bounds: [[43.0556, 141.3445], [43.0595, 141.361]] },
  susukino: { label: "すすきの", bounds: [[43.0485, 141.345], [43.0565, 141.361]] },
};

export function CafeMap({ cafes }: { cafes: readonly CafeSummary[] }) {
  const [area, setArea] = useState<Area>("tanukikoji");
  function switchArea(next: Area) { setArea(next); }
  return <>
    <div className="area-tabs" role="tablist" aria-label="地図のエリア">
      {(Object.keys(areas) as Area[]).map((key) => <button
        key={key} id={`tab-${key}`} role="tab" aria-selected={area === key}
        aria-controls="area-map-panel" tabIndex={area === key ? 0 : -1}
        onClick={() => switchArea(key)}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next = event.key === "Home" ? "tanukikoji" : event.key === "End" ? "susukino" : area === "tanukikoji" ? "susukino" : "tanukikoji";
            switchArea(next);
            document.getElementById(`tab-${next}`)?.focus();
          }
        }}
      >{areas[key].label}<span>{cafes.filter((cafe) => cafe.area === key).length}件</span></button>)}
    </div>
    <div id="area-map-panel" role="tabpanel" aria-labelledby={`tab-${area}`}>
      <CafeAreaMap key={area} area={area} cafes={cafes.filter((cafe) => cafe.area === area)} />
    </div>
  </>;
}

function CafeAreaMap({ cafes, area }: { cafes: readonly CafeSummary[]; area: Area }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const selected = cafes.find((cafe) => cafe.id === selectedId);

  useEffect(() => {
    let disposed = false;
    let instance: LeafletMap | undefined;
    let resize: ResizeObserver | undefined;
    const markerStore = markers.current;

    async function initialize() {
      try {
        const L = await import("leaflet");
        if (disposed || !container.current) return;
        instance = L.map(container.current, { scrollWheelZoom: false });
        mapRef.current = instance;
        instance.fitBounds(areas[area].bounds);
        const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        let failed = false;
        tiles.on("loading", () => { failed = false; });
        tiles.on("tileerror", () => { failed = true; if (!disposed) setStatus("error"); });
        tiles.on("load", () => { if (!disposed) setStatus(failed ? "error" : "ready"); });
        tiles.addTo(instance);

        function renderMarkers() {
        if (!instance) return;
        for (const marker of new Set(markerStore.values())) instance.removeLayer(marker);
        markerStore.clear();
        const groups = new Map<string, CafeSummary[]>();
        for (const cafe of cafes) {
          if (!cafe.location) continue;
          const nearby = [...groups].find(([, members]) => {
            const location = members[0].location!;
            const point = instance!.latLngToLayerPoint([location.latitude, location.longitude]);
            const candidate = instance!.latLngToLayerPoint([cafe.location!.latitude, cafe.location!.longitude]);
            return point.distanceTo(candidate) < 60;
          });
          const key = nearby?.[0] ?? cafe.locationGroup;
          groups.set(key, [...(groups.get(key) ?? []), cafe]);
        }
        for (const group of groups.values()) {
          const cafe = group[0];
          if (!cafe.location) continue;
          const letter = group.length > 1 ? String(group.length) : cafe.category === "maid" ? "M" : cafe.category === "concept" ? "C" : "?";
          const category = group.length > 1 ? "shared" : cafe.category;
          const title = group.map((item) => `${item.name}（${labels[item.category]}）`).join("、");
          const marker = L.marker([cafe.location.latitude, cafe.location.longitude], {
            title,
            alt: title,
            icon: L.divIcon({
              className: "cafe-pin-container",
              html: `<span class="cafe-pin ${category}">${letter}</span>`,
              iconSize: [36, 44], iconAnchor: [18, 44], popupAnchor: [0, -44],
            }),
          });
          const popup = document.createElement("div");
          for (const item of group) {
            const heading = document.createElement("button");
            heading.className = "popup-cafe-button";
            heading.textContent = item.name;
            heading.onclick = () => setSelectedId(item.id);
            const details = document.createElement("p");
            details.textContent = `${labels[item.category]} · ${item.address}`;
            popup.append(heading, details);
          }
          marker.bindPopup(popup).on("click", () => setSelectedId(cafe.id)).addTo(instance);
          for (const item of group) markerStore.set(item.id, marker);
        }
        }
        renderMarkers();
        instance.on("zoomend", renderMarkers);
        resize = new ResizeObserver(() => instance?.invalidateSize());
        resize.observe(container.current);
      } catch {
        if (!disposed) setStatus("error");
      }
    }
    void initialize();
    return () => {
      disposed = true;
      resize?.disconnect();
      instance?.remove();
      mapRef.current = null;
      markerStore.clear();
    };
  }, [cafes, attempt, area]);

  function selectCafe(cafe: CafeSummary) {
    setSelectedId(cafe.id);
    if (cafe.location) mapRef.current?.setView([cafe.location.latitude, cafe.location.longitude], 17);
    markers.current.get(cafe.id)?.openPopup();
  }

  return (
    <div className="explorer">
      <div className="map-panel">
        <div className="map-toolbar">
          <span>{areas[area].label}エリア</span>
          <button onClick={() => mapRef.current?.fitBounds(areas[area].bounds)}>エリア全体へ</button>
        </div>
        <div className="map-canvas" ref={container} role="region" aria-label={`${areas[area].label}の店舗マップ`} />
        <div className="map-status" role="status" aria-live="polite">
          {status === "loading" && "地図を読み込んでいます…"}
          {status === "error" && <><span>地図を読み込めませんでした。店舗情報は一覧から確認できます。</span><button onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>再読み込み</button></>}
        </div>
        <div className="legend" aria-label="ピンの凡例"><span><b className="legend-dot concept">C</b> コンカフェ</span><span><b className="legend-dot maid">M</b> メイドカフェ</span><span><b className="legend-dot shared">数</b> 近くにある候補数</span></div>
      </div>
      <aside className="cafe-sidebar" aria-label="店舗一覧">
        <div className="sidebar-heading"><h2>気になるお店を探す</h2><span>{cafes.length}件</span></div>
        <p className="muted">ピンや店舗名を選ぶと詳細を確認できます。</p>
        <p className="muted">最新バッチの取得候補です。営業未確認の情報を含みます。閉店・休業・移転と判定した候補は除外しています。</p>
        {cafes.some((cafe) => cafe.fetchedAt) && <p className="muted">取得日時：{new Date(cafes.map((cafe) => cafe.fetchedAt ?? "").sort().at(-1)!).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>}
        {cafes.length === 0 && <p>店舗情報は準備中です。</p>}
        <ul className="cafe-cards">{cafes.map((cafe) => <li key={cafe.id}>
          <button className={`cafe-card ${selectedId === cafe.id ? "selected" : ""}`} aria-pressed={selectedId === cafe.id} onClick={() => selectCafe(cafe)}>
            <span className={`category ${cafe.category}`}>{labels[cafe.category]}</span>
            <strong>{cafe.name}</strong><span>{cafe.address}</span>
            <span className="status-badge">{cafe.businessStatus === "operating" ? "営業情報あり" : "営業未確認"}</span>
            <span className="card-action">{cafe.location ? "地図で見る ↗" : "店舗情報を見る（座標未取得）"}</span>
          </button>
        </li>)}</ul>
        {selected && <section className="selected-cafe" aria-label="選択した店舗" aria-live="polite">
          <h3>{selected.name}</h3><p>{labels[selected.category]}</p><p>{selected.address}</p>
          <a href={selected.sourceUrl} target="_blank" rel="noreferrer">情報元で確認 ↗</a>
          <p className="muted">{selected.businessStatus === "operating" ? "営業情報あり" : "営業状態は未確認です。来店前に店舗へご確認ください。"}</p>
          <p className="muted">取得日時：{selected.fetchedAt ? new Date(selected.fetchedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : selected.verifiedOn}</p>
          <p className="muted">位置の確認元：{selected.coordinateSource}</p>
        </section>}
      </aside>
    </div>
  );
}
