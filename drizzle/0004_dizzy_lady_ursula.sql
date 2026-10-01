CREATE TABLE "job_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"seeker_user_id" text,
	"city" text,
	"job_type" text,
	"salary_min" numeric(10, 2),
	"meals_included" boolean DEFAULT false NOT NULL,
	"residence_ok" boolean DEFAULT false NOT NULL,
	"locale" text NOT NULL,
	"confirm_token" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_alerts_confirm_token_unique" UNIQUE("confirm_token"),
	CONSTRAINT "job_alerts_unsubscribe_token_unique" UNIQUE("unsubscribe_token"),
	CONSTRAINT "job_alerts_email_key" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_seeker_user_id_users_id_fk" FOREIGN KEY ("seeker_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_city_cities_id_fk" FOREIGN KEY ("city") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_alerts" ADD CONSTRAINT "job_alerts_job_type_job_types_id_fk" FOREIGN KEY ("job_type") REFERENCES "public"."job_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_alerts_city_job_type_idx" ON "job_alerts" USING btree ("city","job_type");