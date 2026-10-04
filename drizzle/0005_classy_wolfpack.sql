CREATE TYPE "public"."seeker_post_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TABLE "seeker_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"job_type" text NOT NULL,
	"city" text NOT NULL,
	"district" text DEFAULT '' NOT NULL,
	"experience_years" integer,
	"available_from" timestamp,
	"residence_status" "residence_status",
	"expected_salary_min" numeric(10, 2),
	"expected_salary_max" numeric(10, 2),
	"salary_period" "job_salary_period",
	"languages" text[] DEFAULT '{}' NOT NULL,
	"live_in_ok" boolean DEFAULT false NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"contact_wechat" text DEFAULT '' NOT NULL,
	"status" "seeker_post_status" DEFAULT 'draft' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seeker_posts" ADD CONSTRAINT "seeker_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seeker_posts" ADD CONSTRAINT "seeker_posts_job_type_job_types_id_fk" FOREIGN KEY ("job_type") REFERENCES "public"."job_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seeker_posts" ADD CONSTRAINT "seeker_posts_city_cities_id_fk" FOREIGN KEY ("city") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seeker_posts_city_job_type_status_idx" ON "seeker_posts" USING btree ("city","job_type","status");--> statement-breakpoint
CREATE INDEX "seeker_posts_user_id_idx" ON "seeker_posts" USING btree ("user_id");