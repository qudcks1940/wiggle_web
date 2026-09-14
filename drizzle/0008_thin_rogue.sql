CREATE TABLE `hand_raises` (
	`student_id` text PRIMARY KEY NOT NULL,
	`classroom_id` text NOT NULL,
	`raised_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `student_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hand_raises_classroom_idx` ON `hand_raises` (`classroom_id`,`raised_at`);--> statement-breakpoint
CREATE TABLE `teacher_marks` (
	`id` text PRIMARY KEY NOT NULL,
	`classroom_id` text NOT NULL,
	`student_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`artwork_id` text NOT NULL,
	`strokes_json` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`answer` text,
	`answered_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`classroom_id`) REFERENCES `classrooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `student_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`artwork_id`) REFERENCES `artworks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `teacher_marks_student_idx` ON `teacher_marks` (`student_id`,`answered_at`,`created_at`);
-- 선생님 표시·손들기(2026-09-14). drizzle-kit이 함께 만든 arc_id·episode_id·arc_version·current_arc_id·current_episode_id·entry_code ALTER는
-- 운영 DB에 이미 provisionSchema(db/runtime.ts)의 조건부 ALTER로 들어가 있어 뺐다. 스키마 정본은 db/runtime.ts다.
