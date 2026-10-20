-- Bound scans/sorts on growing runtime tables without changing publication or auth decisions.
CREATE INDEX IF NOT EXISTS cafes_building_deleted ON cafes(building_id,deleted_at);
CREATE INDEX IF NOT EXISTS cafes_publication_list ON cafes(publication_status,deleted_at,name);
CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS collected_candidates_run_id ON collected_candidates(run_id DESC);
CREATE INDEX IF NOT EXISTS search_candidates_fetched_at ON search_candidates(fetched_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_status_created ON contact_messages(status,created_at DESC);
CREATE INDEX IF NOT EXISTS contact_rate_limits_started_at ON contact_rate_limits(started_at);
