ALTER TABLE buildings ADD COLUMN address TEXT NOT NULL DEFAULT '';
ALTER TABLE buildings ADD COLUMN latitude REAL;
ALTER TABLE buildings ADD COLUMN longitude REAL;
ALTER TABLE buildings ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
UPDATE buildings SET address=COALESCE((SELECT address FROM cafes WHERE building_id=buildings.id ORDER BY (deleted_at IS NULL) DESC,created_at,id LIMIT 1),'');
CREATE INDEX cafes_building ON cafes(building_id);
CREATE TRIGGER building_version_guard BEFORE UPDATE ON buildings
WHEN NEW.version != OLD.version+1
BEGIN SELECT RAISE(ABORT,'BUILDING_VERSION_CONFLICT'); END;
