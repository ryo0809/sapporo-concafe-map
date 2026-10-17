
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
  
