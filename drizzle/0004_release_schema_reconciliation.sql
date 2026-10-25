-- Reconcile standalone historical extensions on hosted DBs. Schema only; never deletes history.
CREATE TABLE IF NOT EXISTS `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`event_id` text NOT NULL,
	`text` text NOT NULL,
	`kind` text DEFAULT 'observation' NOT NULL,
	`importance` integer DEFAULT 3 NOT NULL,
	`witnessed_with` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_memories_person_time` ON `memories` (`person_id`, `created_at` DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tick_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`model` text,
	`event_id` text,
	`neurons_est` integer,
	`error` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `commitments` (
	`id` text PRIMARY KEY NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`text` text NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'open' NOT NULL,
	`event_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `nudges` (
	`id` text PRIMARY KEY NOT NULL,
	`hint` text NOT NULL,
	`created_at` text NOT NULL,
	`consumed_by_event_id` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS context_cache (
 id TEXT PRIMARY KEY NOT NULL,
 data TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS living_turns (
 id TEXT PRIMARY KEY NOT NULL,
 created_at TEXT NOT NULL,
 data TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_living_turns_created_at ON living_turns (created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS agent_experiences (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT UNIQUE NOT NULL,
 actor_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 data TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_agent_experiences_actor ON agent_experiences(actor_id,seq);
