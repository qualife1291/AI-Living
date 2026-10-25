-- Additive audit trail for completed simulated learning outcomes.
CREATE TABLE IF NOT EXISTS agent_experiences (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT UNIQUE NOT NULL,
 actor_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_experiences_actor ON agent_experiences(actor_id,seq);
