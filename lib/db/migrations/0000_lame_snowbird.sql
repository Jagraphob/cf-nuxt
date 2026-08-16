CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_type_idx` ON `categories` (`name`,`type`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`opening_balance_cents` integer DEFAULT 0 NOT NULL,
	`opening_balance_date` text NOT NULL,
	`currency` text DEFAULT 'NZD' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`category_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`note` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `transactions_category_id_idx` ON `transactions` (`category_id`);--> statement-breakpoint
-- Seed data. Category ids are readable slugs so the 2026 import SQL can reference
-- them directly. Mirrors the columns of the spreadsheet this app replaces.
INSERT OR IGNORE INTO `categories` (`id`, `name`, `type`, `icon`, `sort_order`) VALUES
	('cat_income', 'Income', 'income', 'tabler:cash', 0),
	('cat_saving', 'Saving', 'transfer', 'tabler:pig-money', 1),
	('cat_grocery', 'Grocery', 'expense', 'tabler:shopping-cart', 2),
	('cat_school', 'School', 'expense', 'tabler:school', 3),
	('cat_cars', 'Cars', 'expense', 'tabler:car', 4),
	('cat_train', 'Train', 'expense', 'tabler:train', 5),
	('cat_powershop', 'Powershop', 'expense', 'tabler:bolt', 6),
	('cat_internet', 'Internet', 'expense', 'tabler:wifi', 7),
	('cat_bunnings', 'Bunnings', 'expense', 'tabler:tools', 8),
	('cat_etc', 'Etc.', 'expense', 'tabler:dots', 9),
	('cat_council_rate', 'Council rate', 'expense', 'tabler:building-community', 10);--> statement-breakpoint
-- Opening balance: the spreadsheet's "Beginning of year 2026" row.
INSERT OR IGNORE INTO `settings` (`id`, `opening_balance_cents`, `opening_balance_date`, `currency`)
	VALUES (1, 395100, '2026-01-01', 'NZD');