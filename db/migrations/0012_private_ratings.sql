CREATE TABLE members (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE member_login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE member_login_limits (
  email TEXT PRIMARY KEY,
  sent_at INTEGER NOT NULL
);
CREATE TABLE member_login_ip_limits (
  client_key TEXT PRIMARY KEY,
  requests INTEGER NOT NULL,
  started_at INTEGER NOT NULL
);
CREATE INDEX member_login_limits_sent_at ON member_login_limits(sent_at);
CREATE INDEX member_login_ip_limits_started_at ON member_login_ip_limits(started_at);
CREATE TABLE member_sessions (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX member_sessions_expiry ON member_sessions(expires_at);
CREATE TABLE private_cafe_ratings (
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cafe_id TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  PRIMARY KEY(member_id,cafe_id)
);
