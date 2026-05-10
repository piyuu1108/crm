CREATE TABLE "timetables" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"day" varchar(20) NOT NULL,
	"slot" varchar(20) NOT NULL,
	"assignment_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"faculty_id" integer NOT NULL,
	"is_lab_session" boolean DEFAULT false NOT NULL,
	"lab_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_class_day_slot" UNIQUE("class_id","day","slot")
);
--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_lab_id_rooms_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;