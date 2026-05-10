CREATE TABLE "internal_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"final_theory_marks" numeric(6, 2),
	"final_practical_marks" numeric(6, 2),
	"is_finalized" boolean DEFAULT false NOT NULL,
	"student_name" varchar(150) NOT NULL,
	"subject_name" varchar(100) NOT NULL,
	"subject_type" varchar(20) NOT NULL,
	"division_name" varchar(50) NOT NULL,
	"finalized_by_faculty_id" integer,
	"finalized_at" timestamp,
	"updated_by_faculty_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_exam_marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"internal_exam_id" integer NOT NULL,
	"assignment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"theory_marks" numeric(6, 2),
	"practical_marks" numeric(6, 2),
	"is_draft" boolean DEFAULT true NOT NULL,
	"is_visible" boolean DEFAULT false NOT NULL,
	"student_name" varchar(150) NOT NULL,
	"subject_name" varchar(100) NOT NULL,
	"division_name" varchar(50) NOT NULL,
	"updated_by_faculty_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"exam_name" varchar(100) NOT NULL,
	"exam_number" integer NOT NULL,
	"target_type" varchar(20) DEFAULT 'ALL' NOT NULL,
	"target_year" integer,
	"target_division_id" integer,
	"created_by_faculty_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"is_lab" boolean DEFAULT false NOT NULL,
	"capacity" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "attendance_sessions" DROP CONSTRAINT "attendance_sessions_timetable_id_timetable_entries_id_fk";
--> statement-breakpoint
DROP INDEX "as_timetable_date_idx";--> statement-breakpoint
ALTER TABLE "attendance_sessions" ALTER COLUMN "timetable_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD COLUMN "start_time" time NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD COLUMN "end_time" time NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD COLUMN "marked_by_faculty_id" integer;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD COLUMN "publish_id" varchar(100);--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "internal_evaluations" ADD CONSTRAINT "internal_evaluations_assignment_id_faculty_subject_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."faculty_subject_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_evaluations" ADD CONSTRAINT "internal_evaluations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_evaluations" ADD CONSTRAINT "internal_evaluations_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_evaluations" ADD CONSTRAINT "internal_evaluations_finalized_by_faculty_id_faculty_id_fk" FOREIGN KEY ("finalized_by_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_evaluations" ADD CONSTRAINT "internal_evaluations_updated_by_faculty_id_faculty_id_fk" FOREIGN KEY ("updated_by_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_exam_marks" ADD CONSTRAINT "internal_exam_marks_internal_exam_id_internal_exams_id_fk" FOREIGN KEY ("internal_exam_id") REFERENCES "public"."internal_exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_exam_marks" ADD CONSTRAINT "internal_exam_marks_assignment_id_faculty_subject_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."faculty_subject_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_exam_marks" ADD CONSTRAINT "internal_exam_marks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_exam_marks" ADD CONSTRAINT "internal_exam_marks_updated_by_faculty_id_faculty_id_fk" FOREIGN KEY ("updated_by_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_exams" ADD CONSTRAINT "internal_exams_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_exams" ADD CONSTRAINT "internal_exams_target_division_id_divisions_id_fk" FOREIGN KEY ("target_division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_exams" ADD CONSTRAINT "internal_exams_created_by_faculty_id_faculty_id_fk" FOREIGN KEY ("created_by_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "iev_assign_student_sem_idx" ON "internal_evaluations" USING btree ("assignment_id","student_id","semester_id");--> statement-breakpoint
CREATE INDEX "iev_assign_sem_idx" ON "internal_evaluations" USING btree ("assignment_id","semester_id");--> statement-breakpoint
CREATE UNIQUE INDEX "iem_exam_assign_student_idx" ON "internal_exam_marks" USING btree ("internal_exam_id","assignment_id","student_id");--> statement-breakpoint
CREATE INDEX "iem_assign_exam_idx" ON "internal_exam_marks" USING btree ("assignment_id","internal_exam_id");--> statement-breakpoint
CREATE INDEX "iem_student_idx" ON "internal_exam_marks" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "ie_sem_idx" ON "internal_exams" USING btree ("semester_id");--> statement-breakpoint
CREATE INDEX "ie_sem_num_idx" ON "internal_exams" USING btree ("semester_id","exam_number");--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_marked_by_faculty_id_faculty_id_fk" FOREIGN KEY ("marked_by_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_timetable_id_timetable_entries_id_fk" FOREIGN KEY ("timetable_id") REFERENCES "public"."timetable_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "te_active_idx" ON "timetable_entries" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "as_timetable_date_idx" ON "attendance_sessions" USING btree ("timetable_id","date");