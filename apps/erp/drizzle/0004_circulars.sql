CREATE TABLE "circulars" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"attachment_url" varchar(500),
	"attachment_type" varchar(50),
	"attachment_size" integer,
	"target_type" varchar(20) DEFAULT 'ALL' NOT NULL,
	"target_year" integer,
	"target_division_id" integer,
	"faculty_id" integer NOT NULL,
	"faculty_name" varchar(150) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "circulars_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "publish_status" varchar(20) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "internal_theory_max" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "external_theory_max" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "theory_passing_marks" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "internal_practical_max" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "external_practical_max" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "practical_passing_marks" integer;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD COLUMN "color" varchar(20) DEFAULT '#6366f1';--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD COLUMN "is_lab" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD COLUMN "lab_id" varchar(20);--> statement-breakpoint
ALTER TABLE "circulars" ADD CONSTRAINT "circulars_target_division_id_divisions_id_fk" FOREIGN KEY ("target_division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circulars" ADD CONSTRAINT "circulars_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "circ_target_idx" ON "circulars" USING btree ("target_type","target_year","target_division_id");--> statement-breakpoint
CREATE INDEX "circ_faculty_idx" ON "circulars" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "circ_created_idx" ON "circulars" USING btree ("created_at");