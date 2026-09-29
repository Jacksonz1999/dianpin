CREATE TYPE "public"."auth_channel" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" "auth_channel" NOT NULL,
	"identifier" text NOT NULL,
	"code_hash" text NOT NULL,
	"intended_role" "user_role" NOT NULL,
	"next_path" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"ip" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
CREATE INDEX "auth_challenges_identifier_idx" ON "auth_challenges" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "auth_challenges_ip_idx" ON "auth_challenges" USING btree ("ip");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");