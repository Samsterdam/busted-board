CREATE TABLE "community_link_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"flagged_at" timestamp DEFAULT now(),
	CONSTRAINT "community_link_flags_unique" UNIQUE("link_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "community_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"tmdb_type" text NOT NULL,
	"url" text NOT NULL,
	"domain" text NOT NULL,
	"label" text,
	"status" text DEFAULT 'approved' NOT NULL,
	"flag_count" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp DEFAULT now(),
	CONSTRAINT "community_links_url_unique" UNIQUE("tmdb_id","tmdb_type","url")
);
--> statement-breakpoint
ALTER TABLE "community_link_flags" ADD CONSTRAINT "community_link_flags_link_id_community_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."community_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_link_flags" ADD CONSTRAINT "community_link_flags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_links" ADD CONSTRAINT "community_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_links_media_idx" ON "community_links" USING btree ("tmdb_id","tmdb_type");