import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  country: text("country").notNull().default("US"),
  contentLanguage: text("content_language").notNull().default("any"),
  preferCaptions: integer("prefer_captions").notNull().default(0),
});

export const ratings = sqliteTable("ratings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tmdbId: integer("tmdb_id").notNull(),
  tmdbType: text("tmdb_type", { enum: ["movie", "tv"] }).notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  rating: integer("rating").notNull(),
  notes: text("notes"),
  watchStatus: text("watch_status", {
    enum: ["watched", "watching", "completed", "dropped"],
  })
    .notNull()
    .default("watched"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const watchlist = sqliteTable("watchlist", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tmdbId: integer("tmdb_id").notNull(),
  tmdbType: text("tmdb_type", { enum: ["movie", "tv"] }).notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  addedAt: integer("added_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const dismissedItems = sqliteTable("dismissed_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tmdbId: integer("tmdb_id").notNull(),
  tmdbType: text("tmdb_type", { enum: ["movie", "tv"] }).notNull(),
  dismissedAt: integer("dismissed_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const tasteProfile = sqliteTable("taste_profile", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
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
  lastGeneratedAt: integer("last_generated_at", { mode: "timestamp" }),
});

export const vibeTags = sqliteTable("vibe_tags", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tag: text("tag").notNull(),
  addedAt: integer("added_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const userPlatforms = sqliteTable("user_platforms", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  platformSlug: text("platform_slug").notNull(),
  platformName: text("platform_name").notNull(),
  platformType: text("platform_type", { enum: ["paid", "free"] })
    .notNull()
    .default("paid"),
  addedAt: integer("added_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const feedCache = sqliteTable("feed_cache", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  recommendations: text("recommendations").notNull(),
  generatedAt: integer("generated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const scoresCache = sqliteTable("scores_cache", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  tmdbId: integer("tmdb_id").notNull(),
  tmdbType: text("tmdb_type", { enum: ["movie", "tv"] }).notNull(),
  audienceScore: real("audience_score"),
  criticsScore: real("critics_score"),
  cinemaScore: real("cinema_score"),
  ribbon: text("ribbon"),
  voteCount: integer("vote_count"),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const importHistory = sqliteTable("import_history", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  source: text("source", { enum: ["letterboxd", "imdb", "trakt"] }).notNull(),
  rowsImported: integer("rows_imported").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
