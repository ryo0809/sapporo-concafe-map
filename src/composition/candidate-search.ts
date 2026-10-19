import "server-only";
import { D1CandidateSearch } from "@/infrastructure/admin/candidate-search";
import { SearchCandidates } from "@/application/admin/search-candidates";

export const createCandidateSearch=()=>new SearchCandidates(new D1CandidateSearch());
