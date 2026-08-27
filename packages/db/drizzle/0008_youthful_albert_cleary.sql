ALTER TABLE `users` ADD `free_generations_used` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `users`
SET `free_generations_used` = MIN(
  3,
  (SELECT COUNT(*) FROM `podcasts` WHERE `podcasts`.`user_id` = `users`.`id`)
);
