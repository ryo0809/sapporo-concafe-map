import { validateCafeInput, InputError } from "@/domain/admin/managed-cafe";
import type { ManagementRepository } from "@/domain/admin/repositories";

export class ManageCafes {
  constructor(private readonly repository:ManagementRepository) {}
  list(){return this.repository.list();}
  async remove(id:string,actor:string,version:unknown){
    if(typeof version!=="number"||!Number.isInteger(version)||version<1)throw new InputError("削除対象のバージョンが不正です。読み込み直してください。");
    await this.repository.remove(id,actor,version);
  }
  async save(data:unknown,actor:string,id?:string,version?:number){
    if(id&&(!Number.isInteger(version)||!version||version<1))throw new InputError("更新バージョンが不正です。読み込み直してください。");
    const input=validateCafeInput(data);
    return this.repository.save(input,actor,id,version);
  }
}
