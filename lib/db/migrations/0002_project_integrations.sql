CREATE TABLE `project_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`v0_project_id` text(255) NOT NULL,
	`provider` text(32) NOT NULL,
	`provider_project_ref` text(255) NOT NULL,
	`environment_variable_ids` text NOT NULL,
	`connected_by_user_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`connected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_integrations_v0_project_id_provider_unique` ON `project_integrations` (`v0_project_id`,`provider`);