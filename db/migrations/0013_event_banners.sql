CREATE TABLE event_banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  destination TEXT NOT NULL CHECK(destination IN ('none','detail','external')),
  external_url TEXT NOT NULL DEFAULT '',
  detail_text TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX event_banners_active ON event_banners(published,starts_at,ends_at);
