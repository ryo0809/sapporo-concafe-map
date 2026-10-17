import {addressFloor,buildingAddress} from "../../domain/cafes/building-address";
import { createHash, randomUUID } from "node:crypto";
import {InputError,type CafeInput,type ManagedCafe} from "../../domain/admin/managed-cafe";

interface CafeRow {
  id: string; name: string; area: CafeInput["area"]; category: CafeInput["category"];
  address: string; building_id: string | null; building_name: string | null;
  floor_name: string | null; floor_label: string; latitude: number | null; longitude: number | null;
  business_status: CafeInput["businessStatus"]; publication_status: CafeInput["publicationStatus"];
  source_url: string; social_urls: string; fetched_at: string | null; verified_on: string;
  coordinate_source: string; version: number; created_at: string; updated_at: string;
  publish_at: string | null; official_url: string;
  building_address:string|null;building_latitude:number|null;building_longitude:number|null;
}

const selectCafe = `SELECT c.*, b.name AS building_name, b.address AS building_address, b.latitude AS building_latitude, b.longitude AS building_longitude, f.name AS floor_name FROM cafes c
  LEFT JOIN buildings b ON b.id=c.building_id LEFT JOIN floors f ON f.id=c.floor_id`;

function fromRow(row: CafeRow): ManagedCafe {
  return {
    id: row.id, name: row.name, area: row.area, category: row.category, address: row.building_id ? buildingAddress(row.building_address || row.address,row.building_name??"") : row.address,
    buildingId:row.building_id??"",
    buildingName: row.building_name ?? "", floor: row.floor_name || row.floor_label || addressFloor(row.address),
    location: (row.building_latitude??row.latitude) === null || (row.building_longitude??row.longitude) === null ? null : { latitude: (row.building_latitude??row.latitude)!, longitude: (row.building_longitude??row.longitude)! },
    businessStatus: row.business_status, publicationStatus: row.publication_status === "published" && row.publish_at ? "scheduled" : row.publication_status,
    publishAt: row.publish_at ?? undefined, officialUrl: row.official_url,
    sourceUrl: row.source_url, socialUrls: JSON.parse(row.social_urls), fetchedAt: row.fetched_at ?? undefined,
    verifiedOn: row.verified_on, coordinateSource: row.coordinate_source || "位置の確認元は未登録",
    locationGroup: row.building_id ?? row.id, version: row.version,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function conflict(): Error & { code: string } {
  return Object.assign(new Error("別の更新が行われました。読み込み直してください。"), { code: "CONFLICT" });
}
const stableId = (value: string) => createHash("sha256").update(value).digest("hex");

export class D1CafeStore {
  private readonly database: () => Promise<D1Database>;
  constructor(database: () => Promise<D1Database>) { this.database = database; }

  async list(publicOnly = false): Promise<ManagedCafe[]> {
    const db = await this.database();
    const filter = " WHERE c.deleted_at IS NULL" + (publicOnly ? " AND c.publication_status='published' AND (c.publish_at IS NULL OR c.publish_at<=?) AND c.business_status NOT IN ('closed','temporarily_closed','moved')" : "");
    const statement = db.prepare(selectCafe + filter + " ORDER BY c.name");
    const rows = await (publicOnly ? statement.bind(new Date().toISOString()) : statement).all<CafeRow>();
    return rows.results.map(fromRow);
  }

  async find(id: string): Promise<ManagedCafe | null> {
    const db = await this.database();
    const row = await db.prepare(selectCafe + " WHERE c.id=? AND c.deleted_at IS NULL").bind(id).first<CafeRow>();
    return row ? fromRow(row) : null;
  }

  async remove(id:string,actor:string,expectedVersion:number):Promise<void>{
    const db=await this.database();
    const existing=await this.find(id);
    if(!existing)throw Object.assign(new Error("店舗がありません。"),{code:"NOT_FOUND"});
    if(existing.version!==expectedVersion)throw conflict();
    const now=new Date().toISOString();
    try{
      await db.batch([
        db.prepare("UPDATE cafes SET deleted_at=?,updated_at=?,version=? WHERE id=?").bind(now,now,expectedVersion+1,id),
        db.prepare("INSERT INTO cafe_history(cafe_id,actor,action,before_json,after_json,created_at) VALUES(?,?,?,?,?,?)")
          .bind(id,actor,"delete",JSON.stringify(existing),JSON.stringify({...existing,deletedAt:now,version:expectedVersion+1,updatedAt:now}),now),
      ]);
    }catch(error){
      if(error instanceof Error&&error.message.includes("CAFE_VERSION_CONFLICT"))throw conflict();
      throw error;
    }
  }

  async save(input: CafeInput, actor: string, id: string = randomUUID(), expectedVersion?: number): Promise<ManagedCafe> {
    const db = await this.database();
    const existing = await this.find(id);
    if (expectedVersion !== undefined && (!existing || existing.version !== expectedVersion)) throw conflict();
    const statements: D1PreparedStatement[] = [];
    let buildingId: string | null = null, floorId: string | null = null;
    if(input.buildingId){
      const building=await db.prepare("SELECT id,name,area,address,latitude,longitude FROM buildings WHERE id=?").bind(input.buildingId).first<{id:string;name:string;area:string;address:string;latitude:number|null;longitude:number|null}>();
      if(!building)throw new InputError("選択したビルが見つかりません。ビルを選択し直してください。");
      if(building.area!==input.area)throw new InputError("ビルと店舗のエリアを一致させてください。");
      buildingId=building.id;
      input={...input,buildingName:building.name,address:buildingAddress(building.address||input.address,building.name),location:building.latitude===null||building.longitude===null?input.location:{latitude:building.latitude,longitude:building.longitude}};
    }else if (input.buildingName.trim()) {
      const street = input.address.normalize("NFKC").replace(/[一二三四五六七八九]/g, value => String("一二三四五六七八九".indexOf(value) + 1)).match(/南\d+条[東西]\d+/)?.[0] ?? "";
      const building = await db.prepare("SELECT id FROM buildings WHERE area=? AND name=? AND street=?").bind(input.area, input.buildingName.trim(), street).first<{ id: string }>();
      buildingId = building?.id ?? stableId(JSON.stringify([input.area, input.buildingName.trim(), street]));
      statements.push(db.prepare("INSERT OR IGNORE INTO buildings(id,area,name,street) VALUES(?,?,?,?)").bind(buildingId, input.area, input.buildingName.trim(), street));
    }
    if(buildingId&&input.floor.trim()) {
        const floor = await db.prepare("SELECT id FROM floors WHERE building_id=? AND name=?").bind(buildingId, input.floor.trim()).first<{ id: string }>();
        floorId = floor?.id ?? stableId(JSON.stringify([buildingId, input.floor.trim()]));
        statements.push(db.prepare("INSERT OR IGNORE INTO floors VALUES(?,?,?)").bind(floorId, buildingId, input.floor.trim()));
    }
    const now = new Date().toISOString();
    const version = (existing?.version ?? 0) + 1;
    const data = {
      name: input.name, area: input.area, category: input.category, address: input.address,
      building_id: buildingId, floor_id: floorId, latitude: input.location?.latitude ?? null, longitude: input.location?.longitude ?? null,
      business_status: input.businessStatus, publication_status: input.publicationStatus === "scheduled" ? "published" : input.publicationStatus, source_url: input.sourceUrl,
      publish_at: input.publicationStatus === "scheduled" ? input.publishAt : null, official_url: input.officialUrl ?? "",
      social_urls: JSON.stringify(input.socialUrls), fetched_at: input.fetchedAt || null, verified_on: input.verifiedOn,
      coordinate_source: input.coordinateSource, version, updated_at: now, floor_label: input.floor.trim(),
    };
    if (existing) {
      // The database trigger rejects a concurrent write with an outdated version.
      statements.push(db.prepare(`UPDATE cafes SET ${Object.keys(data).map(key => `${key}=?`).join(",")} WHERE id=?`).bind(...Object.values(data), id));
    } else {
      const created = { id, ...data, created_at: now };
      statements.push(db.prepare(`INSERT INTO cafes(${Object.keys(created).join(",")}) VALUES(${Object.keys(created).map(() => "?").join(",")})`).bind(...Object.values(created)));
    }
    const saved: ManagedCafe = { ...input, id, locationGroup: buildingId ?? id, version, createdAt: existing?.createdAt ?? now, updatedAt: now };
    statements.push(db.prepare("INSERT INTO cafe_history(cafe_id,actor,action,before_json,after_json,created_at) VALUES(?,?,?,?,?,?)")
      .bind(id, actor, existing ? "update" : "create", existing ? JSON.stringify(existing) : null, JSON.stringify(saved), now));
    statements.push(db.prepare(selectCafe + " WHERE c.id=?").bind(id));
    try {
      const results = await db.batch<CafeRow>(statements);
      return fromRow(results[results.length - 1].results[0]);
    } catch (error) {
      if (error instanceof Error && (error.message.includes("CAFE_VERSION_CONFLICT") || error.cause instanceof Error && error.cause.message.includes("CAFE_VERSION_CONFLICT"))) throw conflict();
      throw error;
    }
  }
}
