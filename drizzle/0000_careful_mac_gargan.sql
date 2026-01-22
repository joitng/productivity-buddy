CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`chunk_id` text NOT NULL,
	`timestamp` text NOT NULL,
	`on_task` integer NOT NULL,
	`flow_rating` integer NOT NULL,
	`comments` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`chunk_id`) REFERENCES `scheduled_chunks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chunk_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`chunk_id` text NOT NULL,
	`date` text NOT NULL,
	`action` text NOT NULL,
	`modified_name` text,
	`modified_start_time` text,
	`modified_end_time` text,
	`modified_color` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`chunk_id`) REFERENCES `scheduled_chunks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `day_label_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`day_label_id` text NOT NULL,
	`date` text NOT NULL,
	`action` text NOT NULL,
	`modified_label` text,
	`modified_color` text,
	`modified_emoji` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`day_label_id`) REFERENCES `day_labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `day_labels` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`color` text NOT NULL,
	`emoji` text,
	`recurrence` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `google_auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `google_calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`google_event_id` text NOT NULL,
	`calendar_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_all_day` integer DEFAULT false NOT NULL,
	`is_fixed` integer DEFAULT true NOT NULL,
	`last_synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scheduled_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`recurrence` text NOT NULL,
	`color` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `synced_calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`google_calendar_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `synced_calendars_google_calendar_id_unique` ON `synced_calendars` (`google_calendar_id`);