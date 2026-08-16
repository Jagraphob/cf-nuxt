CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`period` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `budgets_category_id_idx` ON `budgets` (`category_id`);--> statement-breakpoint
CREATE INDEX `budgets_start_date_idx` ON `budgets` (`start_date`);