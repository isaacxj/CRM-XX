ALTER TABLE `tasks` ADD `kind` text DEFAULT 'follow_up' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `activity_id` integer REFERENCES activities(id);