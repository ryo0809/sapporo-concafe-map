import type { Cafe } from "@/domain/cafes/cafe";
import type { CafeRepository } from "@/domain/cafes/cafe-repository";

/** 初期開発用。実店舗データと永続化は未導入。 */
export class InMemoryCafeRepository implements CafeRepository {
  constructor(private readonly cafes: readonly Cafe[] = []) {}

  async findAll(): Promise<readonly Cafe[]> {
    return this.cafes.map((cafe) => ({ ...cafe }));
  }
}
