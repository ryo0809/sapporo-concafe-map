import type { CandidateSearchGateway } from "@/domain/admin/candidates";
import { InputError } from "@/domain/admin/managed-cafe";
export class SearchCandidates {
  constructor(private readonly gateway:CandidateSearchGateway){}
  search(query:string,area:string,live:boolean){
    if(query.trim().length<2||query.length>100)throw new InputError("検索語は2〜100文字で入力してください");
    if(!["all","tanukikoji","susukino"].includes(area))throw new InputError("検索エリアが不正です");
    return this.gateway.search(query.trim(),area,live);
  }
}
