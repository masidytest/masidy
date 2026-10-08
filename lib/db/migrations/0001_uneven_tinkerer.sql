CREATE TABLE `project_ownerships` (
	`id` text PRIMARY KEY NOT NULL,
	`v0_project_id` text(255) NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_ownerships_v0_project_id_unique` ON `project_ownerships` (`v0_project_id`);