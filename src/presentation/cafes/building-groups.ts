import type { CafeSummary } from "@/application/cafes/list-cafes";
import { getBuildingDetails } from "@/domain/cafes/building-details";
export { getBuildingDetails } from "@/domain/cafes/building-details";

export function groupCafesByBuilding(cafes: readonly CafeSummary[]) {
  const groups = new Map<string, { key: string; name: string; street: string; stores: { cafe: CafeSummary; floor: string }[] }>();
  for (const cafe of cafes) {
    const building = getBuildingDetails(cafe.address,cafe.buildingName,cafe.floor);
    if (!groups.has(building.key)) groups.set(building.key, { ...building, stores: [] });
    groups.get(building.key)!.stores.push({ cafe, floor: building.floor });
  }
  const floorOrder = (floor: string) => floor ? (floor.startsWith("B") ? -1 : 1) * Number(floor.replace(/\D/g, "")) : 999;
  return [...groups.values()].sort((a, b) => (a.key === "unknown" ? 1 : b.key === "unknown" ? -1 : a.name.localeCompare(b.name, "ja")))
    .map((group) => ({ ...group, stores: group.stores.sort((a, b) => floorOrder(a.floor) - floorOrder(b.floor) || a.cafe.name.localeCompare(b.cafe.name, "ja")) }));
}
