CREATE TABLE "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"body" text,
	"subreddit" text,
	"author" text,
	"score" integer DEFAULT 0 NOT NULL,
	"found_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"draft_response" text,
	"posted_at" timestamp,
	"posted_url" text,
	CONSTRAINT "opportunities_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"content" text NOT NULL,
	"scheduled_for" timestamp,
	"buffer_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
