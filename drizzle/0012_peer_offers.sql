CREATE TABLE `peer_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`data` text NOT NULL,
	`checksum` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_peer_offers_recipient` ON `peer_offers` (`session_id`,`recipient_id`);
--> statement-breakpoint
CREATE TRIGGER peer_offers_immutable_update BEFORE UPDATE ON peer_offers
BEGIN SELECT RAISE(ABORT,'peer offers are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER peer_offers_immutable_delete BEFORE DELETE ON peer_offers
BEGIN SELECT RAISE(ABORT,'peer offers are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER ground_shared_batches_immutable_update BEFORE UPDATE ON ground_shared_batches
BEGIN SELECT RAISE(ABORT,'shared batches are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER ground_shared_batches_immutable_delete BEFORE DELETE ON ground_shared_batches
BEGIN SELECT RAISE(ABORT,'shared batches are immutable'); END;
