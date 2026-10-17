import type { CafeInput } from "./managed-cafe";
export interface StoreCandidate extends CafeInput {
  id:string; duplicateIds:string[]; provider:string;
}
export interface CandidateSearchGateway {
  search(query:string,area:string,live:boolean):Promise<{candidates:StoreCandidate[];warnings:string[]}>;
}
