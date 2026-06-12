import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  serial,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// "user" and "account" (singular) — required by Auth.js DrizzleAdapter
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified"),
  image: text("image"),
  createdAt: timestamp("createdAt").defaultNow(),
  country: text("country").notNull().default("US"),
  contentLanguage: text("content_language").notNull().default("any"),
  preferCaptions: boolean("prefer_captions").notNull().default(false),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tmdbId: integer("tmdb_id").notNull(),
  tmdbType: text("tmdb_type").notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  rating: integer("rating").notNull(),
  notes: text("notes"),
  watchStatus: text("watch_status").notNull().default("watched"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tmdbId: integer("tmdb_id").notNull(),
  tmdbType: text("tmdb_type").notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const dismissedItems = pgTable("dismissed_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tmdbId: integer("tmdb_id").notNull(),
  tmdbType: text("tmdb_type").notNull(),
  dismissedAt: timestamp("dismissed_at").defaultNow(),
});

export const tasteProfile = pgTable("taste_profile", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  topThemes: text("top_themes"),
  avoidThemes: text("avoid_themes"),
  favDirectors: text("fav_directors"),
  favActors: text("fav_actors"),
  toneDescription: text("tone_description"),
  recommendationStrategy: text("recommendation_strategy"),
  lastGeneratedAt: timestamp("last_generated_at"),
});

export const vibeTags = pgTable("vibe_tags", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tag: text("tag").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const userPlatforms = pgTable("user_platforms", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  platformSlug: text("platform_slug").notNull(),
  platformName: text("platform_name").notNull(),
  platformType: text("platform_type").notNull().default("paid"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const feedCache = pgTable("feed_cache", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  recommendations: text("recommendations").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const scoresCache = pgTable("scores_cache", {
  id: serial("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull(),
  tmdbType: text("tmdb_type").notNull(),
  audienceScore: real("audience_score"),
  criticsScore: real("critics_score"),
  cinemaScore: real("cinema_score"),
  ribbon: text("ribbon"),
  voteCount: integer("vote_count"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

export const importHistory = pgTable("import_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  source: text("source").notNull(),
  rowsImported: integer("rows_imported").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
