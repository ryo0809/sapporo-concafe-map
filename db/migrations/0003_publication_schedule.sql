ALTER TABLE cafes ADD COLUMN publish_at TEXT;
ALTER TABLE cafes ADD COLUMN official_url TEXT NOT NULL DEFAULT '';

-- Keep previous values in the audit log before making existing stores private.
INSERT INTO cafe_history(cafe_id,actor,action,before_json,after_json,created_at)
SELECT id,'migration:0003','hide',
  json_object('publicationStatus',publication_status,'version',version),
  json_object('publicationStatus','hidden','version',version+1),
  strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM cafes;
UPDATE cafes SET publication_status='hidden',publish_at=NULL,version=version+1,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now');
