CREATE TABLE `ground_shared_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`state_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`data` text NOT NULL,
	`checksum` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`state_id`) REFERENCES `ground_shared_states`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shared_batch_sequence` ON `ground_shared_batches` (`state_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shared_batch_operation` ON `ground_shared_batches` (`state_id`,`operation_id`);--> statement-breakpoint
CREATE TABLE `ground_shared_sources` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`world_id` text NOT NULL,
	`revision` integer NOT NULL,
	`captured_at` integer NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_shared_source_revision` ON `ground_shared_sources` (`world_id`,`revision`);--> statement-breakpoint
CREATE TABLE `ground_shared_states` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`data` text NOT NULL,
	`checksum` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER ground_shared_capture_world AFTER UPDATE ON worlds
WHEN EXISTS(SELECT 1 FROM ground_shared_states WHERE id=NEW.id)
BEGIN
 INSERT INTO ground_shared_sources(world_id,revision,captured_at,data)
 SELECT NEW.id,NEW.revision,
  MAX(CAST((julianday('now')-2440587.5)*86400000 AS INTEGER),CAST(json_extract(s.data,'$.cursorRealMs') AS INTEGER),(SELECT COALESCE(MAX(captured_at),0) FROM ground_shared_sources WHERE world_id=NEW.id)),
  CASE WHEN length(CAST(NEW.data AS BLOB))<=2097152 THEN NEW.data ELSE RAISE(ABORT,'shared world source exceeds budget') END
 FROM ground_shared_states s WHERE s.id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER ground_shared_sources_immutable_update BEFORE UPDATE ON ground_shared_sources
BEGIN SELECT RAISE(ABORT,'shared sources are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER ground_shared_sources_immutable_delete BEFORE DELETE ON ground_shared_sources
BEGIN SELECT RAISE(ABORT,'shared sources are immutable'); END;
