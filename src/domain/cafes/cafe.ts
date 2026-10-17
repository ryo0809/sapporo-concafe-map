export type CafeArea = "tanukikoji" | "susukino";

export interface Cafe {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly category: "concept" | "maid" | "unknown";
  readonly location: { readonly latitude: number; readonly longitude: number } | null;
  readonly sourceUrl: string;
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
