import type { CafeRepository } from "@/domain/cafes/cafe-repository";
import type { CafeArea } from "@/domain/cafes/cafe";

export interface CafeSummary {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly category: "concept" | "maid" | "unknown";
  readonly location: { readonly latitude: number; readonly longitude: number } | null;
  readonly sourceUrl: string;
  readonly verifiedOn: string;
  readonly area: CafeArea;
  readonly locationGroup: string;
  readonly coordinateSource: string;
  readonly fetchedAt?: string;
  readonly businessStatus?: "unknown" | "operating";
}

export class ListCafes {
  constructor(private readonly repository: CafeRepository) {}

  async execute(): Promise<readonly CafeSummary[]> {
    const cafes = await this.repository.findAll();
    return cafes.map(({ id, name, address, category, location, sourceUrl, verifiedOn, area, locationGroup, coordinateSource, fetchedAt, businessStatus }) => ({
      id, name, address, category, location: location ? { ...location } : null, sourceUrl, verifiedOn, area, locationGroup, coordinateSource, fetchedAt, businessStatus,
    }));
  }
}
