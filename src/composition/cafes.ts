import { ListCafes } from "@/application/cafes/list-cafes";
import { CollectionCafeRepository } from "@/infrastructure/cafes/collection-cafe-repository";

/** 具体的な実装の選択と依存注入を集約する。 */
export function createListCafes(): ListCafes {
  return new ListCafes(new CollectionCafeRepository());
}
