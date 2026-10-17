// Only match a floor at the end: street numbers and names such as 第3ビル remain intact.
const trailingFloor = /(?:地下\s*\d+\s*階|B?\s*\d+\s*(?:F|階))(?:\s*[・,、/／〜～\-]\s*(?:地下\s*)?B?\s*\d+\s*(?:F|階))*\s*(?:\([^)]*\))?$/i;

export function addressFloor(address: string): string {
  const normalized = address.normalize("NFKC").trim();
  return normalized.match(trailingFloor)?.[0].trim() ?? "";
}

/** A building owns its street address and name, never a tenant's floor. */
export function buildingAddress(address: string, name = ""): string {
  let base = address.normalize("NFKC").trim().replace(trailingFloor, "").trim();
  const building = name.normalize("NFKC").trim();
  if (building && base.endsWith(building)) base = base.slice(0, -building.length).trim();
  else if (building) {
    // Existing imports use aliases such as N.VICORO / N・ヴィコロ and 第五 / 第5.
    const originalName = addressBuildingName(base);
    const details = getBuildingDetails(base);
    if (originalName && details.key !== "unknown" && details.name === getBuildingDetails(building).name) {
      base = base.slice(0, -originalName.length).trim();
    }
  }
  return base;
}

/** Compose once for every public address (map, search, popup and fallback list). */
export function cafeAddress(address: string, buildingName = "", floor?: string): string {
  if (!buildingName && floor === undefined) return address;
  const base = buildingAddress(address, buildingName);
  const ownFloor = floor === undefined ? addressFloor(address) : floor.trim();
  return [base, `${buildingName.trim()}${ownFloor}`].filter(Boolean).join(" ");
}
import {addressBuildingName,getBuildingDetails} from "./building-details";

