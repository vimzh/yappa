CREATE TABLE `interests` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interests_topic_unique` ON `interests` (`topic`);--> statement-breakpoint
ALTER TABLE `podcasts` ADD `scheduled_for` integer;