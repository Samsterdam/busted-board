CREATE TABLE "catalog_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"media_type" text NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"calls_used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "catalog_sync_log_unique" UNIQUE("slug","media_type")
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "season_count" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "episode_count" integer;