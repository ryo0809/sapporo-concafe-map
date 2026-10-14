import { ListCafes } from "@/application/cafes/list-cafes";
import { InMemoryCafeRepository } from "@/infrastructure/cafes/in-memory-cafe-repository";

/** 具体的な実装の選択と依存注入を集約する。 */
export function createListCafes(): ListCafes {
  return new ListCafes(new InMemoryCafeRepository());
}
