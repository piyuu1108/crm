ALTER TABLE "subjects" ADD COLUMN "short_code" varchar(20);--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "credit" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "semester" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "course_id" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;