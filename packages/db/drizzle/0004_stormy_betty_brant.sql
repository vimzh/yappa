PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_podcasts` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer NOT NULL,
	`duration_minutes` integer DEFAULT 1 NOT NULL,
	`transcript_iterations` integer NOT NULL,
	`quality_score` integer,
	`transcript` text,
	`sources` text,
	`report` text,
	`article` text,
	`audio_path` text,
	`scheduled_for` integer,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_podcasts`("id", "topic", "title", "status", "progress", "duration_minutes", "transcript_iterations", "quality_score", "transcript", "sources", "report", "article", "audio_path", "scheduled_for", "error", "created_at", "updated_at") SELECT "id", "topic", "title", "status", "progress", "duration_minutes", "transcript_iterations", "quality_score", "transcript", "sources", "report", "article", "audio_path", "scheduled_for", "error", "created_at", "updated_at" FROM `podcasts`;--> statement-breakpoint
DROP TABLE `podcasts`;--> statement-breakpoint
ALTER TABLE `__new_podcasts` RENAME TO `podcasts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;