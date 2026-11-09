ALTER TABLE members ADD COLUMN nickname TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE members ADD COLUMN email_verified_at TEXT;
UPDATE members SET email_verified_at=created_at;

CREATE TABLE member_email_codes (
  id TEXT NOT NULL,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose IN ('register','reset')),
  code_hash TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  PRIMARY KEY(email,purpose)
);
CREATE INDEX member_email_codes_expires ON member_email_codes(expires_at);

CREATE TABLE member_password_attempts (
  email TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  started_at INTEGER NOT NULL
);
CREATE INDEX member_password_attempts_started ON member_password_attempts(started_at);
