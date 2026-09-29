CREATE TYPE "public"."application_status" AS ENUM('submitted', 'viewed', 'contacted', 'hired', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."job_residence_required" AS ENUM('none', 'prefer', 'required');--> statement-breakpoint
CREATE TYPE "public"."job_salary_period" AS ENUM('hour', 'day', 'month');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'active', 'paused', 'filled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('job', 'store');--> statement-breakpoint
CREATE TYPE "public"."residence_status" AS ENUM('有居留', '办理中', '学生居留', '家庭居留', '无居留');--> statement-breakpoint
CREATE TYPE "public"."store_verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('seeker', 'employer');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"seeker_user_id" text NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"contact_revealed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_job_id_seeker_user_id_key" UNIQUE("job_id","seeker_user_id")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name_zh" text NOT NULL,
	"name_es" text NOT NULL,
	"region" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name_zh" text NOT NULL,
	"name_es" text NOT NULL,
	"icon" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"title_zh" text NOT NULL,
	"title_es" text NOT NULL,
	"job_type" text NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"salary_min" numeric(10, 2) NOT NULL,
	"salary_max" numeric(10, 2) NOT NULL,
	"salary_period" "job_salary_period" NOT NULL,
	"headcount" integer DEFAULT 1 NOT NULL,
	"schedule" text NOT NULL,
	"live_in" boolean DEFAULT false NOT NULL,
	"meals_included" boolean DEFAULT false NOT NULL,
	"language_required" text NOT NULL,
	"residence_required" "job_residence_required" DEFAULT 'none' NOT NULL,
	"description_zh" text NOT NULL,
	"description_es" text NOT NULL,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" "report_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"seeker_user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "seeker_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"job_types" text[] DEFAULT '{}' NOT NULL,
	"experience_years" integer,
	"available_from" timestamp,
	"residence_status" "residence_status",
	"expected_salary_min" numeric(10, 2),
	"expected_salary_max" numeric(10, 2),
	"preferred_cities" text[] DEFAULT '{}' NOT NULL,
	"live_in_ok" boolean DEFAULT false NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"bio" text,
	"avatar" text
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name_zh" text NOT NULL,
	"name_es" text NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"address" text NOT NULL,
	"category" text NOT NULL,
	"cover_image" text NOT NULL,
	"photos" text[] DEFAULT '{}' NOT NULL,
	"verification_status" "store_verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"rating_avg" numeric(3, 2) DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"phone" text NOT NULL,
	"wechat" text,
	"name" text NOT NULL,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_seeker_user_id_users_id_fk" FOREIGN KEY ("seeker_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_job_type_job_types_id_fk" FOREIGN KEY ("job_type") REFERENCES "public"."job_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_city_cities_id_fk" FOREIGN KEY ("city") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_seeker_user_id_users_id_fk" FOREIGN KEY ("seeker_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seeker_profiles" ADD CONSTRAINT "seeker_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_city_cities_id_fk" FOREIGN KEY ("city") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_job_id_idx" ON "applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "applications_seeker_user_id_idx" ON "applications" USING btree ("seeker_user_id");--> statement-breakpoint
CREATE INDEX "jobs_city_job_type_status_idx" ON "jobs" USING btree ("city","job_type","status");--> statement-breakpoint
CREATE INDEX "jobs_store_id_idx" ON "jobs" USING btree ("store_id");