ALTER TABLE `users` ADD `unlimited_generations` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `users`
SET `unlimited_generations` = true
WHERE lower(`email`) = 'vimzh.dev@gmail.com';
