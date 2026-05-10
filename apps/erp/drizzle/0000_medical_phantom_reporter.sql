CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"attendance_session_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"status" varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"timetable_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"date" date NOT NULL,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"subject_name" varchar(100) NOT NULL,
	"faculty_name" varchar(100) NOT NULL,
	"division_name" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_type" varchar(20) NOT NULL,
	"user_name" varchar(150) NOT NULL,
	"action" varchar(50) NOT NULL,
	"module" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counselor_division_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"faculty_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"faculty_name" varchar(100) NOT NULL,
	"division_name" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"total_sems" integer DEFAULT 6 NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"course_code" varchar(20) NOT NULL,
	"course_name" varchar(100) NOT NULL,
	"specialization" varchar(20) NOT NULL,
	"batch_year" integer NOT NULL,
	"semester_no" integer NOT NULL,
	"division_no" integer NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"max_capacity" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faculty" (
	"id" serial PRIMARY KEY NOT NULL,
	"faculty_code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"mobile" varchar(15) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"must_change_pwd" boolean DEFAULT true NOT NULL,
	"gender" varchar(10),
	"dob" date,
	"qualification" varchar(100),
	"experience_years" integer,
	"specialization" varchar(150),
	"designation" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "faculty_faculty_code_unique" UNIQUE("faculty_code"),
	CONSTRAINT "faculty_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "faculty_roles" (
	"faculty_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "faculty_roles_faculty_id_role_id_pk" PRIMARY KEY("faculty_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "faculty_subject_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"faculty_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"faculty_name" varchar(100) NOT NULL,
	"subject_name" varchar(100) NOT NULL,
	"subject_type" varchar(20) NOT NULL,
	"division_name" varchar(50) NOT NULL,
	"course_code" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"assignment_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"student_name" varchar(150) NOT NULL,
	"subject_name" varchar(100) NOT NULL,
	"subject_type" varchar(20) NOT NULL,
	"division_name" varchar(50) NOT NULL,
	"internal_theory" numeric(6, 2),
	"external_theory" numeric(6, 2),
	"internal_practical" numeric(6, 2),
	"external_practical" numeric(6, 2),
	"max_internal_theory" numeric(6, 2),
	"max_external_theory" numeric(6, 2),
	"max_internal_practical" numeric(6, 2),
	"max_external_practical" numeric(6, 2),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"file_path" varchar(255) NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_prior_education" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"prev_institution" varchar(200) NOT NULL,
	"prev_course" varchar(100) NOT NULL,
	"prev_enrollment_no" varchar(50),
	"semesters_completed" integer NOT NULL,
	"reason_for_transfer" text,
	CONSTRAINT "student_prior_education_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "student_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"target_faculty_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"student_name" varchar(150) NOT NULL,
	"target_faculty_name" varchar(100) NOT NULL,
	"division_name" varchar(50) NOT NULL,
	"request_type" varchar(50) NOT NULL,
	"subject" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"temp_id" varchar(30),
	"student_id" varchar(20),
	"spid" varchar(30),
	"enrollment_id" varchar(30),
	"abc_id" varchar(30),
	"full_name" varchar(150) NOT NULL,
	"dob" date NOT NULL,
	"gender" varchar(10) NOT NULL,
	"blood_group" varchar(5),
	"email" varchar(150) NOT NULL,
	"mobile" varchar(15) NOT NULL,
	"parent_mobile" varchar(15),
	"optional_mobile" varchar(15),
	"address" text,
	"aadhaar_student" varchar(20),
	"aadhaar_parent" varchar(20),
	"course_id" integer NOT NULL,
	"category" varchar(10) NOT NULL,
	"board" varchar(20) NOT NULL,
	"twelfth_percent" numeric(5, 2),
	"twelfth_stream" varchar(50),
	"school_name" varchar(200),
	"udise_code" varchar(20),
	"entry_type" varchar(20) DEFAULT 'fresh' NOT NULL,
	"entry_semester_no" integer DEFAULT 1 NOT NULL,
	"current_semester_no" integer,
	"current_division_id" integer,
	"current_division_name" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"password_hash" varchar(255),
	"profile_photo" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "students_temp_id_unique" UNIQUE("temp_id"),
	CONSTRAINT "students_student_id_unique" UNIQUE("student_id"),
	CONSTRAINT "students_spid_unique" UNIQUE("spid"),
	CONSTRAINT "students_enrollment_id_unique" UNIQUE("enrollment_id"),
	CONSTRAINT "students_abc_id_unique" UNIQUE("abc_id"),
	CONSTRAINT "students_email_unique" UNIQUE("email"),
	CONSTRAINT "students_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"subject_type" varchar(20) NOT NULL,
	CONSTRAINT "subjects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "timetable_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"assignment_id" integer NOT NULL,
	"day_of_week" varchar(10) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"subject_name" varchar(100) NOT NULL,
	"faculty_name" varchar(100) NOT NULL,
	"division_name" varchar(50) NOT NULL,
	"course_code" varchar(20) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_attendance_session_id_attendance_sessions_id_fk" FOREIGN KEY ("attendance_session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_timetable_id_timetable_entries_id_fk" FOREIGN KEY ("timetable_id") REFERENCES "public"."timetable_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counselor_division_assignments" ADD CONSTRAINT "counselor_division_assignments_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counselor_division_assignments" ADD CONSTRAINT "counselor_division_assignments_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counselor_division_assignments" ADD CONSTRAINT "counselor_division_assignments_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_roles" ADD CONSTRAINT "faculty_roles_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_roles" ADD CONSTRAINT "faculty_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_subject_assignments" ADD CONSTRAINT "faculty_subject_assignments_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_subject_assignments" ADD CONSTRAINT "faculty_subject_assignments_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_subject_assignments" ADD CONSTRAINT "faculty_subject_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_subject_assignments" ADD CONSTRAINT "faculty_subject_assignments_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_assignment_id_faculty_subject_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."faculty_subject_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_prior_education" ADD CONSTRAINT "student_prior_education_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_requests" ADD CONSTRAINT "student_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_requests" ADD CONSTRAINT "student_requests_target_faculty_id_faculty_id_fk" FOREIGN KEY ("target_faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_requests" ADD CONSTRAINT "student_requests_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_current_division_id_divisions_id_fk" FOREIGN KEY ("current_division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_assignment_id_faculty_subject_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."faculty_subject_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "att_sess_student_idx" ON "attendance" USING btree ("attendance_session_id","student_id");--> statement-breakpoint
CREATE INDEX "att_student_sess_idx" ON "attendance" USING btree ("student_id","attendance_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "as_timetable_date_idx" ON "attendance_sessions" USING btree ("timetable_id","date");--> statement-breakpoint
CREATE INDEX "as_div_date_sem_idx" ON "attendance_sessions" USING btree ("division_id","date","semester_id");--> statement-breakpoint
CREATE INDEX "as_sem_date_idx" ON "attendance_sessions" USING btree ("semester_id","date");--> statement-breakpoint
CREATE INDEX "al_module_entity_idx" ON "audit_logs" USING btree ("module","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "al_user_time_idx" ON "audit_logs" USING btree ("user_id","user_type","created_at");--> statement-breakpoint
CREATE INDEX "al_time_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cda_sem_fac_div_idx" ON "counselor_division_assignments" USING btree ("semester_id","faculty_id","division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "divisions_batch_divno_idx" ON "divisions" USING btree ("batch_year","division_no");--> statement-breakpoint
CREATE INDEX "divisions_batch_spec_idx" ON "divisions" USING btree ("batch_year","specialization");--> statement-breakpoint
CREATE UNIQUE INDEX "fsa_sem_fac_sub_div_idx" ON "faculty_subject_assignments" USING btree ("semester_id","faculty_id","subject_id","division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marks_student_assign_sem_idx" ON "marks" USING btree ("student_id","assignment_id","semester_id");--> statement-breakpoint
CREATE INDEX "marks_assign_sem_idx" ON "marks" USING btree ("assignment_id","semester_id");--> statement-breakpoint
CREATE INDEX "sr_student_sem_idx" ON "student_requests" USING btree ("student_id","semester_id");--> statement-breakpoint
CREATE INDEX "sr_targetfac_status_idx" ON "student_requests" USING btree ("target_faculty_id","status");--> statement-breakpoint
CREATE INDEX "te_div_day_start_sem_idx" ON "timetable_entries" USING btree ("division_id","day_of_week","start_time","semester_id");--> statement-breakpoint
CREATE INDEX "te_assign_sem_idx" ON "timetable_entries" USING btree ("assignment_id","semester_id");