ALTER TABLE `student_profiles` ADD `seat_number` integer;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `real_name` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `claimed_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `students_classroom_seat_uq` ON `student_profiles` (`classroom_id`,`seat_number`) WHERE seat_number IS NOT NULL AND archived_at IS NULL;--> statement-breakpoint
-- 이미 있는 학생은 스스로 만든 프로필이므로 자리를 쓰고 있는 상태로 채운다.
-- 비워 두면 번호 입장 로직이 '빈 자리'로 보고 남이 그 프로필을 차지할 수 있다.
UPDATE `student_profiles` SET `claimed_at` = `created_at` WHERE `claimed_at` IS NULL;