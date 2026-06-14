ALTER TABLE "media" ADD COLUMN "overview" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "original_language" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "motn_rating" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "motn_service_id" text;--> statement-breakpoint
ALTER TABLE "platforms" ADD COLUMN "watchmode_source_id" integer;