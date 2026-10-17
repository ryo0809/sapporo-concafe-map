import {buildingAddress} from "@/domain/cafes/building-address";
import {randomUUID} from "node:crypto";
import {getD1} from "./d1";
import {validateBuilding,type ManagedBuilding} from "@/domain/admin/building";
import {InputError} from "@/domain/admin/managed-cafe";

const select=`SELECT b.*, (SELECT COUNT(*) FROM cafes c WHERE c.building_id=b.id AND c.deleted_at IS NULL) AS store_count FROM buildings b`;
type Row={id:string;name:string;area:ManagedBuilding["area"];address:string;latitude:number|null;longitude:number|null;version:number;store_count:number};
const fromRow=(row:Row):ManagedBuilding=>({id:row.id,name:row.name,area:row.area,address:buildingAddress(row.address,row.name),location:row.latitude===null||row.longitude===null?null:{latitude:row.latitude,longitude:row.longitude},version:row.version,storeCount:row.store_count});
export class D1BuildingStore{
  async list(){const result=await(await getD1()).prepare(select+" ORDER BY b.area,b.name,b.address").all<Row>();return result.results.map(fromRow);}
  async save(value:unknown,id?:string){
    const input=validateBuilding(value),db=await getD1();
    const version=(value as Record<string,unknown>).version;
    if(id&&(typeof version!=="number"||!Number.isInteger(version)||version<1))throw new InputError("ビルのバージョンが不正です。読み込み直してください。");
    const current=id?await db.prepare(select+" WHERE b.id=?").bind(id).first<Row>():null;
    if(id&&!current)throw Object.assign(new Error("ビルがありません。"),{code:"NOT_FOUND"});
    if(current&&current.version!==version)throw Object.assign(new Error("ビルが更新されています。"),{code:"CONFLICT"});
    if(current&&current.area!==input.area&&current.store_count>0)throw new InputError("所属店舗のあるビルのエリアは変更できません。");
    // street remains the legacy identity column; new records use the complete address.
    const candidates=await db.prepare("SELECT id,address FROM buildings WHERE area=? AND name=? AND id!=?").bind(input.area,input.name,id??"").all<{id:string;address:string}>();
    const duplicate=candidates.results.some(row=>buildingAddress(row.address,input.name)===input.address);
    if(duplicate)throw new InputError("同じエリア・名前・住所のビルが登録されています。既存のビルを選択してください。");
    const buildingId=id??randomUUID();
    try{
      if(current)await db.prepare("UPDATE buildings SET name=?,area=?,address=?,street=?,latitude=?,longitude=?,version=? WHERE id=? AND version=?")
        .bind(input.name,input.area,input.address,input.address,input.location?.latitude??null,input.location?.longitude??null,current.version+1,buildingId,version).run().then(result=>{if(!result.meta.changes)throw Object.assign(new Error("ビルが更新されています。"),{code:"CONFLICT"});});
      else await db.prepare("INSERT INTO buildings(id,area,name,street,address,latitude,longitude) VALUES(?,?,?,?,?,?,?)").bind(buildingId,input.area,input.name,input.address,input.address,input.location?.latitude??null,input.location?.longitude??null).run();
    }catch(error){
      if(error instanceof Error&&/UNIQUE constraint failed/.test(error.message))throw new InputError("同じ名前・所在地のビルが登録されています。");
      throw error;
    }
    const saved=await db.prepare(select+" WHERE b.id=?").bind(buildingId).first<Row>();
    return fromRow(saved!);
  }
}
