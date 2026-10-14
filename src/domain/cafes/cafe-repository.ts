import type { Cafe } from "./cafe";

export interface CafeRepository {
  findAll(): Promise<readonly Cafe[]>;
}
