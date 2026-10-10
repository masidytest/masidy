ALTER TABLE `project_integrations` RENAME TO `legacy_project_integrations`;
--> statement-breakpoint
CREATE TABLE `marketplace_project_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`v0_project_id` text(255) NOT NULL,
	`vercel_project_id` text(255) NOT NULL,
	`provider` text(128) NOT NULL,
	`installation_id` text(255) NOT NULL,
	`integration_id` text(255) NOT NULL,
	`product_id` text(255) NOT NULL,
	`product_slug` text(128) NOT NULL,
	`product_name` text(255) NOT NULL,
	`resource_name` text(255) NOT NULL,
	`status` text(32) DEFAULT 'connected' NOT NULL,
	`connected_by_user_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`connected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketplace_project_integrations_v0_project_id_provider_unique` ON `marketplace_project_integrations` (`v0_project_id`,`provider`);