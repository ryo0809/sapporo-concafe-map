import {cafeAddress} from "@/domain/cafes/building-address";
import type { CafeRepository } from "@/domain/cafes/cafe-repository";
import type { CafeArea } from "@/domain/cafes/cafe";

export interface CafeSummary {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly category: "concept" | "maid" | "unknown";
  readonly location: { readonly latitude: number; readonly longitude: number } | null;
  readonly officialUrl?: string;
  readonly socialUrls?: readonly string[];
  readonly verifiedOn: string;
  readonly area: CafeArea;
  readonly locationGroup: string;
  readonly coordinateSource: string;
  readonly fetchedAt?: string;
  readonly businessStatus?: "unknown" | "operating";
  readonly buildingName?: string;
  readonly floor?: string;
}

export class ListCafes {
  constructor(private readonly repository: CafeRepository) {}

  async execute(): Promise<readonly CafeSummary[]> {
    const cafes = await this.repository.findAll();
    return cafes.map(({ id, name, address, category, location, officialUrl, socialUrls, verifiedOn, area, locationGroup, coordinateSource, fetchedAt, businessStatus,buildingName,floor }) => ({
      id, name, address: cafeAddress(address,buildingName,floor), category, location: location ? { ...location } : null, officialUrl, socialUrls: [...(socialUrls ?? [])], verifiedOn, area, locationGroup, coordinateSource, fetchedAt, businessStatus,buildingName,floor,
    }));
  }
}
