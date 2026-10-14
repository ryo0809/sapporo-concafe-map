import type { CafeRepository } from "@/domain/cafes/cafe-repository";

export interface CafeSummary {
  readonly id: string;
  readonly name: string;
  readonly address: string;
}

export class ListCafes {
  constructor(private readonly repository: CafeRepository) {}

  async execute(): Promise<readonly CafeSummary[]> {
    const cafes = await this.repository.findAll();
    return cafes.map(({ id, name, address }) => ({ id, name, address }));
  }
}
