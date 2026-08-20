CREATE TABLE `podcasts` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer NOT NULL,
	`transcript_iterations` integer NOT NULL,
	`quality_score` integer,
	`transcript` text,
	`sources` text,
	`report` text,
	`audio_path` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
