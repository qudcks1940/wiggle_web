CREATE TABLE `storybook_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`storybook_id` text NOT NULL,
	`student_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_artwork_id` text,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`storybook_id`) REFERENCES `storybooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `student_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_artwork_id`) REFERENCES `artworks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `storybook_assets_book_idx` ON `storybook_assets` (`storybook_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `storybook_assets_student_idx` ON `storybook_assets` (`student_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `storybook_mutations` (
	`request_id` text NOT NULL,
	`storybook_id` text NOT NULL,
	`student_id` text NOT NULL,
	`result_revision` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`storybook_id`, `student_id`, `request_id`),
	FOREIGN KEY (`storybook_id`) REFERENCES `storybooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `student_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `storybook_mutations_book_idx` ON `storybook_mutations` (`storybook_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `storybooks` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`classroom_id` text NOT NULL,
	`title` text NOT NULL,
	`document_json` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`last_mutation_id` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `student_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `storybooks_student_idx` ON `storybooks` (`student_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `storybooks_classroom_idx` ON `storybooks` (`classroom_id`,`updated_at`);