CREATE TABLE `anonymous_chat_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text(45) NOT NULL,
	`v0_chat_id` text(255) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_ownerships` (
	`id` text PRIMARY KEY NOT NULL,
	`v0_chat_id` text(255) NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_ownerships_v0_chat_id_unique` ON `chat_ownerships` (`v0_chat_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text(64) NOT NULL,
	`password` text(64),
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
