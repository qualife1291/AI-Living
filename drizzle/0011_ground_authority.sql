CREATE TABLE `ground_authority_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`state_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`data` text NOT NULL,
	`checksum` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`state_id`) REFERENCES `ground_authority_states`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_authority_batch_sequence` ON `ground_authority_batches` (`state_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_authority_batch_operation` ON `ground_authority_batches` (`state_id`,`operation_id`);--> statement-breakpoint
CREATE TABLE `ground_authority_states` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`data` text NOT NULL,
	`checksum` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `ground_shared_states`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TRIGGER ground_authority_batches_immutable_update BEFORE UPDATE ON ground_authority_batches
BEGIN SELECT RAISE(ABORT,'authority batches are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER ground_authority_batches_immutable_delete BEFORE DELETE ON ground_authority_batches
BEGIN SELECT RAISE(ABORT,'authority batches are immutable'); END;
