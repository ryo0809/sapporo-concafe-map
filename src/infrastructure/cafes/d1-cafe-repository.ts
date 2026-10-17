import "server-only";
import { getD1 } from "../database/d1";
import { D1CafeStore } from "../database/d1-cafe-store";
import type { CafeRepository } from "@/domain/cafes/cafe-repository";

export class D1CafeRepository implements CafeRepository {
  async findAll() {
    const cafes = await new D1CafeStore(getD1).list(true);
    return cafes.map(cafe => ({ ...cafe, businessStatus: cafe.businessStatus === "operating" ? "operating" as const : "unknown" as const }));
  }
}
