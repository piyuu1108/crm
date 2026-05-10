ALTER TABLE "student_requests" ADD COLUMN "attachment_url" varchar(500);--> statement-breakpoint
ALTER TABLE "student_requests" ADD COLUMN "attachment_type" varchar(50);--> statement-breakpoint
ALTER TABLE "student_requests" ADD COLUMN "attachment_size" integer;