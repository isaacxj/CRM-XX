CREATE INDEX `activities_company_idx` ON `activities` (`company_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `activities_thread_idx` ON `activities` (`thread_id`);--> statement-breakpoint
CREATE INDEX `companies_business_idx` ON `companies` (`business`,`archived_at`);--> statement-breakpoint
CREATE INDEX `contacts_company_idx` ON `contacts` (`company_id`);--> statement-breakpoint
CREATE INDEX `contacts_email_idx` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `deal_events_deal_idx` ON `deal_events` (`deal_id`);--> statement-breakpoint
CREATE INDEX `deals_company_idx` ON `deals` (`company_id`);--> statement-breakpoint
CREATE INDEX `deals_stage_idx` ON `deals` (`stage`);--> statement-breakpoint
CREATE INDEX `tasks_company_idx` ON `tasks` (`company_id`);--> statement-breakpoint
CREATE INDEX `tasks_open_idx` ON `tasks` (`done_at`,`due_date`);--> statement-breakpoint
CREATE INDEX `tasks_activity_idx` ON `tasks` (`activity_id`);