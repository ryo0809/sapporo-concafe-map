ALTER TABLE cafes ADD COLUMN floor_label TEXT NOT NULL DEFAULT '';

-- D1 batch() is atomic. A stale version aborts the entire write and history batch.
CREATE TRIGGER cafes_version_guard BEFORE UPDATE ON cafes
WHEN NEW.version != OLD.version + 1
BEGIN
  SELECT RAISE(ABORT, 'CAFE_VERSION_CONFLICT');
END;
