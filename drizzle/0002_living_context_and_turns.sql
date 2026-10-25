-- Context cache and append-only living turns; no changes to existing history.
CREATE TABLE IF NOT EXISTS context_cache (
 id TEXT PRIMARY KEY NOT NULL,
 data TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS living_turns (
 id TEXT PRIMARY KEY NOT NULL,
 created_at TEXT NOT NULL,
 data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_living_turns_created_at ON living_turns (created_at DESC);
