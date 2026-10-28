CREATE TABLE `ground_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`data` text NOT NULL,
	`checksum` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `ground_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ground_session_sequence` ON `ground_batches` (`session_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ground_session_operation` ON `ground_batches` (`session_id`,`operation_id`);--> statement-breakpoint
CREATE TABLE `ground_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`checksum` text NOT NULL,
	`updated_at` text NOT NULL
);
