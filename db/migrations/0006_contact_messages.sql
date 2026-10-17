CREATE TABLE contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  store_name TEXT NOT NULL,
  reference_url TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','done')),
  created_at TEXT NOT NULL
);
CREATE INDEX contact_messages_created_at ON contact_messages(created_at DESC);
CREATE TABLE contact_rate_limits (
  client_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  started_at INTEGER NOT NULL
);
