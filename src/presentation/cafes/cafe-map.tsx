"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { CafeSummary } from "@/application/cafes/list-cafes";
import { getBuildingDetails, groupCafesByBuilding } from "./building-groups";
import { SocialLinks } from "./social-links";

const labels = { concept: "コンカフェ", maid: "メイドカフェ", unknown: "種別未確認" };
type Area = CafeSummary["area"];
const areas: Record<Area, { label: string; bounds: [[number, number], [number, number]] }> = {
  tanukikoji: { label: "狸小路", bounds: [[43.0556, 141.3445], [43.0595, 141.361]] },
  susukino: { label: "すすきの", bounds: [[43.0485, 141.345], [43.0565, 141.361]] },
};

export function CafeMap({ cafes }: { cafes: readonly CafeSummary[] }) {
  const [area, setArea] = useState<Area>("susukino");
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
            const next = event.key === "Home" ? "tanukikoji" : event.key === "End" ? "susukino" : key === "tanukikoji" ? "susukino" : "tanukikoji";
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
  const [query, setQuery] = useState("");
  const listedCafes = cafes.filter((cafe) => `${cafe.name} ${cafe.address}`.normalize("NFKC").toLowerCase().includes(query.normalize("NFKC").trim().toLowerCase()));
  const buildingGroups = groupCafesByBuilding(listedCafes);
  const [buildingKey, setBuildingKey] = useState<string | null>(null);
  const activeBuilding = buildingGroups.find((building) => building.key === buildingKey) ?? buildingGroups[0];
  const activeBuildingIndex = activeBuilding ? buildingGroups.indexOf(activeBuilding) : 0;
  const floors = activeBuilding ? [...new Set(activeBuilding.stores.map((store) => store.floor))].map((floor) => ({
    name: floor || "階数未確認", stores: activeBuilding.stores.filter((store) => store.floor === floor),
  })) : [];
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
          const glyph = group.length > 1 ? String(group.length) : cafe.category === "unknown" ? "?" : `<span class="category-glyph ${cafe.category}-glyph" aria-hidden="true"></span>`;
          const category = group.length > 1 ? "shared" : cafe.category;
          const title = group.map((item) => `${item.name}（${labels[item.category]}）`).join("、");
          const marker = L.marker([cafe.location.latitude, cafe.location.longitude], {
            title,
            alt: title,
            icon: L.divIcon({
              className: "cafe-pin-container",
              html: `<span class="cafe-pin ${category}">${glyph}</span>`,
              iconSize: [36, 44], iconAnchor: [18, 44], popupAnchor: [0, -44],
            }),
          });
          const popup = document.createElement("div");
          for (const item of group) {
            const heading = document.createElement("button");
            heading.className = "popup-cafe-button";
            heading.textContent = item.name;
            heading.onclick = () => { setSelectedId(item.id); setBuildingKey(getBuildingDetails(item.address,item.buildingName,item.floor).key); };
            const details = document.createElement("p");
            details.textContent = `${labels[item.category]} · ${item.address}`;
            popup.append(heading, details);
          }
          marker.bindPopup(popup).on("click", () => { setSelectedId(cafe.id); setBuildingKey(getBuildingDetails(cafe.address,cafe.buildingName,cafe.floor).key); }).addTo(instance);
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

  function selectBuilding(building: (typeof buildingGroups)[number]) {
    setBuildingKey(building.key);
    setSelectedId(null);
    mapRef.current?.closePopup();
    if (building.key === "unknown") return;
    const location = building.stores.find(({ cafe }) => cafe.location)?.cafe.location;
    if (location) mapRef.current?.setView([location.latitude, location.longitude], 17, { animate: false });
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
        <div className="legend" aria-label="ピンの凡例"><span><b className="legend-dot concept"><span className="category-glyph concept-glyph" aria-hidden="true"/></b> コンカフェ</span><span><b className="legend-dot maid"><span className="category-glyph maid-glyph" aria-hidden="true"/></b> メイドカフェ</span><span><b className="legend-dot shared">数</b> 近くにある候補数</span></div>
      </div>
        {selected && <section className="selected-cafe" aria-label="選択した店舗" aria-live="polite">
          <button className="detail-close" aria-label="店舗詳細を閉じる" onClick={() => { setSelectedId(null); mapRef.current?.closePopup(); }}>×</button>
          <span className={`category ${selected.category}`}>{labels[selected.category]}</span>
          <h3>{selected.name}</h3><p className="detail-address">{selected.address}</p>
          {selected.officialUrl&&<a className="source-link" href={selected.officialUrl} target="_blank" rel="noreferrer">公式サイト ↗</a>}
          <SocialLinks urls={selected.socialUrls ?? []} cafeName={selected.name}/>
          <p className="detail-status">{selected.businessStatus === "operating" ? "営業情報あり" : "営業状態は未確認です。来店前に店舗へご確認ください。"}</p>
        </section>}
      <section className="cafe-sidebar" aria-label="店舗一覧">
        <div className="sidebar-heading"><h2>ビルからお店を探す</h2><span>{listedCafes.length}件</span></div>
        <label className="search-field"><span aria-hidden="true">⌕</span><input type="search" aria-label="店舗名・住所で検索" placeholder="店舗名・住所で検索" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <p className="list-hint">お店を選ぶと、詳しい情報が表示されます。</p>
        {buildingGroups.length > 0 && <div className="building-tabs" role="tablist" aria-label="ビルを選択">
          {buildingGroups.map((building, index) => <button key={building.key} role="tab"
            id={`building-tab-${area}-${index}`} aria-controls={`building-panel-${area}`}
            aria-selected={activeBuilding?.key === building.key} tabIndex={activeBuilding?.key === building.key ? 0 : -1}
            onClick={() => selectBuilding(building)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? buildingGroups.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buildingGroups.length) % buildingGroups.length;
              selectBuilding(buildingGroups[next]);
              document.getElementById(`building-tab-${area}-${next}`)?.focus();
            }}
          >{building.name}<span>{building.stores.length}</span></button>)}
        </div>}
        {activeBuilding && <section className="building-panel" role="tabpanel" id={`building-panel-${area}`} aria-labelledby={`building-tab-${area}-${activeBuildingIndex}`}>
          <header className="building-heading"><div><h3>{activeBuilding.name}</h3>{activeBuilding.street && <p>{activeBuilding.street}</p>}</div><span>{activeBuilding.stores.length}件</span></header>
          <div className="floor-grid">{floors.map((floor) => <section className="floor-group" key={floor.name} aria-label={floor.name}>
          <h4 className="floor-heading">{floor.name}<span>{floor.stores.length}件</span></h4>
          <ul className="cafe-cards">{floor.stores.map(({ cafe }) => <li key={cafe.id}>
          <button className={`cafe-card ${selectedId === cafe.id ? "selected" : ""}`} aria-pressed={selectedId === cafe.id} onClick={() => selectCafe(cafe)}>
            <span className={`row-icon ${cafe.category}`} aria-hidden="true">{cafe.category === "unknown" ? "•" : <span className={`category-glyph ${cafe.category}-glyph`}/>}</span>
            <span className="row-content"><strong>{cafe.name}</strong>{activeBuilding.key === "unknown" && <span>{cafe.address.replace(/^北海道(?:北海道)?札幌市中央区|^札幌市中央区/, "")}</span>}
              <span className="row-meta">{cafe.category !== "unknown" && `${labels[cafe.category]} · `}{cafe.location ? "地図で確認" : "位置未確認"}</span></span>
            <span className="row-arrow" aria-hidden="true">›</span>
          </button>
        </li>)}</ul></section>)}</div></section>}
        {listedCafes.length === 0 && <p className="empty-list">{cafes.length ? "一致するお店が見つかりませんでした。" : "店舗情報は準備中です。"}</p>}
        <details className="data-note"><summary>掲載情報について</summary>
          <p>営業未確認の候補を含みます。閉店・休業・移転と判定した候補は除外しています。全店舗を網羅するものではありません。</p>
        </details>
      </section>
    </div>
  );
}
