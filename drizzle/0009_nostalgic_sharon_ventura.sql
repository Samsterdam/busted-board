CREATE TABLE "link_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"tmdb_type" text NOT NULL,
	"media_title" text,
	"url" text NOT NULL,
	"domain" text NOT NULL,
	"label" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"submitted_at" timestamp DEFAULT now(),
	CONSTRAINT "link_suggestions_url_unique" UNIQUE("tmdb_id","tmdb_type","url")
);
--> statement-breakpoint
CREATE TABLE "platform_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"website_url" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "link_suggestions" ADD CONSTRAINT "link_suggestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_suggestions" ADD CONSTRAINT "platform_suggestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_suggestions_user_idx" ON "link_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_suggestions_user_idx" ON "platform_suggestions" USING btree ("user_id");