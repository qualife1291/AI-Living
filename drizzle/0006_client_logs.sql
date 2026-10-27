CREATE TABLE IF NOT EXISTS client_logs (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS client_logs_created_at ON client_logs(created_at);
