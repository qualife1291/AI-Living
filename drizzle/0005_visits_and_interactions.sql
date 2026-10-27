CREATE TABLE `site_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`total` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `view_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`nonce` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visitor_exchanges` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL,
	`data` text NOT NULL
);
