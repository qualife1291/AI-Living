CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`source` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worlds` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL
);
