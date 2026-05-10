ALTER TABLE "students" ALTER COLUMN "dob" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "gender" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "mobile" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "board" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "profile_step" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "profile_status" varchar(20) DEFAULT 'incomplete' NOT NULL;