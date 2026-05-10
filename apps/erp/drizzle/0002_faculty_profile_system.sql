ALTER TABLE "faculty" ADD COLUMN "profile_completion" varchar(20) DEFAULT 'incomplete' NOT NULL;--> statement-breakpoint
ALTER TABLE "faculty" ADD COLUMN "profile_step" integer DEFAULT 1 NOT NULL;--> statement-breakpoint

CREATE TABLE "faculty_personal_info" (
  "id" serial PRIMARY KEY NOT NULL,
  "faculty_id" integer NOT NULL,
  "full_name" varchar(150) NOT NULL,
  "dob" date,
  "gender" varchar(10),
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "faculty_personal_info_faculty_id_unique" UNIQUE("faculty_id")
);--> statement-breakpoint

CREATE TABLE "faculty_contact_info" (
  "id" serial PRIMARY KEY NOT NULL,
  "faculty_id" integer NOT NULL,
  "mobile" varchar(15) NOT NULL,
  "alternate_mobile" varchar(15),
  "address" text,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "faculty_contact_info_faculty_id_unique" UNIQUE("faculty_id")
);--> statement-breakpoint

CREATE TABLE "faculty_professional_info" (
  "id" serial PRIMARY KEY NOT NULL,
  "faculty_id" integer NOT NULL,
  "qualification" varchar(100),
  "experience_years" integer,
  "specialization" varchar(150),
  "designation" varchar(100),
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "faculty_professional_info_faculty_id_unique" UNIQUE("faculty_id")
);--> statement-breakpoint

CREATE TABLE "faculty_documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "faculty_id" integer NOT NULL,
  "profile_photo_url" varchar(255) NOT NULL,
  "uploaded_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "faculty_documents_faculty_id_unique" UNIQUE("faculty_id")
);--> statement-breakpoint

ALTER TABLE "faculty_personal_info" ADD CONSTRAINT "faculty_personal_info_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_contact_info" ADD CONSTRAINT "faculty_contact_info_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_professional_info" ADD CONSTRAINT "faculty_professional_info_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_documents" ADD CONSTRAINT "faculty_documents_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE no action ON UPDATE no action;
