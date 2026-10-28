CREATE TABLE `memory_backfill_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`plan_sha256` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `memory_backfill_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_memory_backfill_job_sequence` ON `memory_backfill_batches` (`job_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `memory_backfill_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`data` text NOT NULL,
	`checksum` text NOT NULL,
	`updated_at` text NOT NULL
);

--> statement-breakpoint
CREATE INDEX `idx_memories_actor_event` ON `memories` (`person_id`,`event_id`);
--> statement-breakpoint
CREATE INDEX `idx_experiences_actor_seq` ON `agent_experiences` (`actor_id`,`seq`);
