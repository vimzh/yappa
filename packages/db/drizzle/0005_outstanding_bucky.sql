ALTER TABLE `podcasts` ADD `openai_input_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `openai_cached_input_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `openai_output_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `openai_reasoning_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `openai_web_search_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `openai_metered_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `openai_unpriced_calls` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `openai_cost_nano_usd` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `fish_input_bytes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `fish_tts_requests` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `fish_unpriced_requests` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `fish_cost_nano_usd` integer DEFAULT 0 NOT NULL;