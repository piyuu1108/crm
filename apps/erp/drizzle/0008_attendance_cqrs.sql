CREATE TABLE IF NOT EXISTS "attendance_session_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"faculty_id" integer NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"subject_name" varchar(100) NOT NULL,
	"absent_student_ids" integer[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_analytics_summary" (
	"student_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"present_count" integer DEFAULT 0 NOT NULL,
	"total_lectures" integer DEFAULT 0 NOT NULL,
	"attendance_percentage" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_analytics_summary_pkey" PRIMARY KEY("student_id","division_id","semester_id")
);
--> statement-breakpoint
ALTER TABLE "attendance_session_ledger" ADD CONSTRAINT "attendance_session_ledger_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance_session_ledger" ADD CONSTRAINT "attendance_session_ledger_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance_session_ledger" ADD CONSTRAINT "attendance_session_ledger_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance_analytics_summary" ADD CONSTRAINT "attendance_analytics_summary_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance_analytics_summary" ADD CONSTRAINT "attendance_analytics_summary_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attendance_analytics_summary" ADD CONSTRAINT "attendance_analytics_summary_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asl_absent_ids_gin_idx" ON "attendance_session_ledger" USING gin ("absent_student_ids");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asl_div_date_idx" ON "attendance_session_ledger" USING btree ("division_id","date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aas_div_pct_idx" ON "attendance_analytics_summary" USING btree ("division_id","attendance_percentage");