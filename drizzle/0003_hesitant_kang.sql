ALTER TABLE "jobs" ADD COLUMN "is_seed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "is_seed" boolean DEFAULT false NOT NULL;