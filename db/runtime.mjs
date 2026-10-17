import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

const connections = new Map();
export const databasePath = () => path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || "data/database/sapporo.sqlite");
export function getDatabase() {
  const filename = databasePath();
  if (connections.has(filename)) return connections.get(filename);
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS buildings(id TEXT PRIMARY KEY, area TEXT NOT NULL, name TEXT NOT NULL, street TEXT NOT NULL, UNIQUE(area,name,street));
    CREATE TABLE IF NOT EXISTS floors(id TEXT PRIMARY KEY, building_id TEXT NOT NULL REFERENCES buildings(id), name TEXT NOT NULL, UNIQUE(building_id,name));
    CREATE TABLE IF NOT EXISTS cafes(
      id TEXT PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL CHECK(area IN ('tanukikoji','susukino')),
      category TEXT NOT NULL CHECK(category IN ('concept','maid','unknown')), address TEXT NOT NULL,
      building_id TEXT REFERENCES buildings(id), floor_id TEXT REFERENCES floors(id), latitude REAL, longitude REAL,
      business_status TEXT NOT NULL CHECK(business_status IN ('unknown','operating','temporarily_closed','closed','moved')),
      publication_status TEXT NOT NULL CHECK(publication_status IN ('draft','published','hidden')),
      source_url TEXT NOT NULL, social_urls TEXT NOT NULL DEFAULT '[]', fetched_at TEXT, verified_on TEXT NOT NULL DEFAULT '',
      coordinate_source TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      CHECK((latitude IS NULL)=(longitude IS NULL)), CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90), CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180)
    );
    CREATE TABLE IF NOT EXISTS administrators(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES administrators(id), expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts(username TEXT PRIMARY KEY, failures INTEGER NOT NULL, started_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS cafe_history(id INTEGER PRIMARY KEY, cafe_id TEXT NOT NULL REFERENCES cafes(id), actor TEXT NOT NULL, action TEXT NOT NULL, before_json TEXT, after_json TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS import_records(source_key TEXT PRIMARY KEY, cafe_id TEXT REFERENCES cafes(id), kind TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS collection_runs(id TEXT PRIMARY KEY, manifest TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS collected_candidates(run_id TEXT NOT NULL REFERENCES collection_runs(id), record_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(run_id,record_id));
    CREATE TABLE IF NOT EXISTS search_candidates(id TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS cafe_public ON cafes(publication_status,business_status,area);
    CREATE INDEX IF NOT EXISTS cafe_name ON cafes(name);
  `);
  // Keep a known floor even when the building name has not been identified.
  if (!db.prepare("PRAGMA table_info(cafes)").all().some((column) => column.name === "floor_label")) {
    db.exec("ALTER TABLE cafes ADD COLUMN floor_label TEXT NOT NULL DEFAULT ''");
  }
  db.prepare("INSERT OR IGNORE INTO schema_migrations VALUES(1,?)").run(new Date().toISOString());
  db.prepare("INSERT OR IGNORE INTO schema_migrations VALUES(2,?)").run(new Date().toISOString());
  connections.set(filename, db);
  return db;
}

export function transaction(action) {
  const db = getDatabase(); db.exec("BEGIN IMMEDIATE");
  try { const result = action(db); db.exec("COMMIT"); return result; }
  catch (error) { db.exec("ROLLBACK"); throw error; }
}

const selectCafe = `SELECT c.*, b.name AS building_name, f.name AS floor_name FROM cafes c
  LEFT JOIN buildings b ON b.id=c.building_id LEFT JOIN floors f ON f.id=c.floor_id`;
function fromRow(row) {
  return { id: row.id, name: row.name, area: row.area, category: row.category, address: row.address,
    buildingName: row.building_name ?? "", floor: row.floor_name ?? row.floor_label, location: row.latitude === null ? null : { latitude: row.latitude, longitude: row.longitude },
    businessStatus: row.business_status, publicationStatus: row.publication_status, sourceUrl: row.source_url,
    socialUrls: JSON.parse(row.social_urls), fetchedAt: row.fetched_at ?? undefined, verifiedOn: row.verified_on,
    coordinateSource: row.coordinate_source || "位置の確認元は未登録", locationGroup: row.building_id ?? row.id,
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function listCafes(publicOnly = false) {
  return getDatabase().prepare(selectCafe + (publicOnly ? " WHERE c.publication_status='published' AND c.business_status NOT IN ('closed','temporarily_closed','moved')" : "") + " ORDER BY c.name").all().map(fromRow);
}
export function findCafe(id) {
  const row = getDatabase().prepare(selectCafe + " WHERE c.id=?").get(id);
  return row ? fromRow(row) : null;
}
/** @param {number|null} expectedVersion */
export function saveCafe(input, actor, id = String(randomUUID()), expectedVersion = null) {
  return transaction((db) => {
    const existing = findCafe(id);
    if (expectedVersion !== null && (!existing || existing.version !== expectedVersion)) {
      const error = new Error("別の更新が行われました。店舗を読み込み直してください。"); error.code = "CONFLICT"; throw error;
    }
    let buildingId = null, floorId = null;
    if (input.buildingName.trim()) {
      const street = input.address.normalize("NFKC").replace(/[一二三四五六七八九]/g,(value)=>String("一二三四五六七八九".indexOf(value)+1)).match(/南\d+条[東西]\d+/)?.[0] ?? "";
      db.prepare("INSERT OR IGNORE INTO buildings VALUES(?,?,?,?)").run(randomUUID(), input.area, input.buildingName.trim(), street);
      buildingId = db.prepare("SELECT id FROM buildings WHERE area=? AND name=? AND street=?").get(input.area, input.buildingName.trim(), street).id;
      if (input.floor.trim()) {
        db.prepare("INSERT OR IGNORE INTO floors VALUES(?,?,?)").run(randomUUID(), buildingId, input.floor.trim());
        floorId = db.prepare("SELECT id FROM floors WHERE building_id=? AND name=?").get(buildingId, input.floor.trim()).id;
      }
    }
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO cafes(id,name,area,category,address,building_id,floor_id,latitude,longitude,business_status,publication_status,source_url,social_urls,fetched_at,verified_on,coordinate_source,version,created_at,updated_at,floor_label)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, area=excluded.area, category=excluded.category, address=excluded.address, building_id=excluded.building_id, floor_id=excluded.floor_id,
      latitude=excluded.latitude, longitude=excluded.longitude, business_status=excluded.business_status, publication_status=excluded.publication_status,
      source_url=excluded.source_url,social_urls=excluded.social_urls,fetched_at=excluded.fetched_at,verified_on=excluded.verified_on,coordinate_source=excluded.coordinate_source,
      version=excluded.version,updated_at=excluded.updated_at,floor_label=excluded.floor_label`).run(id,input.name,input.area,input.category,input.address,buildingId,floorId,
      input.location?.latitude ?? null,input.location?.longitude ?? null,input.businessStatus,input.publicationStatus,input.sourceUrl,JSON.stringify(input.socialUrls),
      input.fetchedAt || null,input.verifiedOn,input.coordinateSource,existing ? existing.version + 1 : 1,existing?.createdAt ?? now,now,input.floor.trim());
    const saved = findCafe(id);
    db.prepare("INSERT INTO cafe_history(cafe_id,actor,action,before_json,after_json,created_at) VALUES(?,?,?,?,?,?)").run(id,actor,existing ? "update" : "create",existing ? JSON.stringify(existing) : null,JSON.stringify(saved),now);
    return saved;
  });
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password,salt,64).toString("hex")}`;
}
export function verifyPassword(password, hash) {
  const [salt, digest] = hash.split(":");
  const value = scryptSync(password,salt,64); const expected = Buffer.from(digest,"hex");
  return value.length === expected.length && timingSafeEqual(value,expected);
}
export const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
export function authenticate(username, password) {
  const db = getDatabase(); const now = Date.now();
  const attempt = db.prepare("SELECT * FROM login_attempts WHERE username=?").get(username);
  if (attempt && attempt.failures >= 5 && now - attempt.started_at < 15*60*1000) {
    const error = new Error("ログインの試行回数を超えました。15分後に再試行してください。"); error.code = "RATE_LIMIT"; throw error;
  }
  const admin = db.prepare("SELECT * FROM administrators WHERE username=?").get(username);
  const valid = verifyPassword(password,admin?.password_hash ?? hashPassword("invalid-password"));
  if (!admin || !valid) {
    db.prepare(`INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(username) DO UPDATE SET failures=CASE WHEN ?-started_at>=900000 THEN 1 ELSE failures+1 END, started_at=CASE WHEN ?-started_at>=900000 THEN ? ELSE started_at END`).run(username,now,now,now,now);
    return null;
  }
  db.prepare("DELETE FROM login_attempts WHERE username=?").run(username);
  db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now);
  const token = randomBytes(32).toString("hex"); const expiresAt = now+24*60*60*1000;
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(tokenHash(token),admin.id,expiresAt);
  return { token, expiresAt, administrator: { id: admin.id, username: admin.username } };
}
export function getAdministrator(token) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return getDatabase().prepare("SELECT a.id,a.username FROM sessions s JOIN administrators a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>?").get(tokenHash(token),Date.now()) ?? null;
}
export function logout(token) { if (token) getDatabase().prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash(token)); }
