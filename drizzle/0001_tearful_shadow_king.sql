CREATE TABLE "watched" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"tmdb_type" text NOT NULL,
	"title" text NOT NULL,
	"poster_path" text,
	"seen_at" timestamp DEFAULT now(),
	CONSTRAINT "watched_user_media_unique" UNIQUE("user_id","tmdb_id","tmdb_type")
);
--> statement-breakpoint
ALTER TABLE "watched" ADD CONSTRAINT "watched_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;