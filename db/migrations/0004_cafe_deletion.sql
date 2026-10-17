-- Retain history and import references while excluding deleted stores everywhere.
ALTER TABLE cafes ADD COLUMN deleted_at TEXT;
