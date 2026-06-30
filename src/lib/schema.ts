import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  serial,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
// schema.ts intentionally stays as the single schema source to avoid circular
// FK imports. Split into sub-files when this grows past 500 lines.
import type { AdapterAccountType } from "next-auth/adapters";
import { RATING_SOURCE_USER } from "@/lib/config/ratings";

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
  kidsMode: boolean("kids_mode").notNull().default(false),
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
  source: text("source").notNull().default(RATING_SOURCE_USER),
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

// "Seen it" as a signal independent of rating: a watched-but-not-necessarily-
// rated title. Drops out of recommendations and feeds the taste profile as a
// weaker signal than a star rating. Rated titles live in `ratings`; this table
// is for the rating-less "I've watched this" mark from the feed card.
export const watched = pgTable(
  "watched",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tmdbId: integer("tmdb_id").notNull(),
    tmdbType: text("tmdb_type").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    seenAt: timestamp("seen_at").defaultNow(),
  },
  (t) => [unique("watched_user_media_unique").on(t.userId, t.tmdbId, t.tmdbType)]
);

export const dismissedItems = pgTable(
  "dismissed_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tmdbId: integer("tmdb_id").notNull(),
    tmdbType: text("tmdb_type").notNull(),
    // Nullable: pre-existing dismissals predate these columns. They still
    // filter the feed, but only rows with a title render in the "Not
    // Interested" list on /watched.
    title: text("title"),
    posterPath: text("poster_path"),
    // Soft dismissal: the user said "not now, maybe later" rather than a hard
    // no. Still filtered out of the feed, but flagged in the Not Interested
    // list as a candidate to give a second chance.
    secondChance: boolean("second_chance").default(false),
    dismissedAt: timestamp("dismissed_at").defaultNow(),
  },
  (t) => [unique("dismissed_user_media_unique").on(t.userId, t.tmdbId, t.tmdbType)]
);

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

// Shared (not per-user) streaming-availability cache, keyed by title + region.
// "What's streaming where" is the same for everyone in a region, so it's fetched
// from TMDB once and reused across all users — important now that the app is
// multi-user. `providers` holds the JSON-serialized TMDB WatchProviders slice.
export const mediaAvailability = pgTable("media_availability", {
  id: serial("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull(),
  tmdbType: text("tmdb_type").notNull(),
  region: text("region").notNull(),
  providers: text("providers").notNull(),
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

// --- Normalized streaming-availability model -------------------------------
// A relational view of "what media is on which platform, where", sitting
// alongside the denormalized `media_availability` JSON cache above. The cache
// stays the fast read path; these tables answer relational queries the blob
// can't (e.g. "all media on platform X in region Y"). Populated best-effort
// from `getCachedWatchProviders` on each 24h cache refresh — no extra TMDB
// calls. `deep_link_url` is intentionally absent: TMDB exposes no per-platform
// playback link.

// The core media entity, decoupled from any platform instance. Keyed by
// (tmdb_id, tmdb_type) because TMDB ids collide across movie/tv.
export const media = pgTable(
  "media",
  {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    tmdbType: text("tmdb_type").notNull(),
    title: text("title").notNull(),
    releaseYear: integer("release_year"),
    posterPath: text("poster_path"),
    // Populated by catalog sync from Movie of the Night / Watchmode:
    overview: text("overview"),
    originalLanguage: text("original_language"),
    motnRating: integer("motn_rating"),     // 0–100 aggregated rating from MOTN
    seasonCount: integer("season_count"),   // TV series only
    episodeCount: integer("episode_count"), // TV series only
    syncedAt: timestamp("synced_at"),       // last time populated from external catalog
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [unique("media_tmdb_unique").on(t.tmdbId, t.tmdbType)]
);

// Streaming services. Self-populating: any provider TMDB returns is upserted by
// `tmdbId` (the conflict target). `PLATFORM_REGISTRY` pre-seeds curated names/types.
export const platforms = pgTable("platforms", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tmdbId: integer("tmdb_id").unique(),
  type: text("type").notNull().default("paid"),
  iconUrl: text("icon_url"),
  // External catalog API identifiers — populated by sync-catalog:
  motnServiceId: text("motn_service_id"),       // e.g. "tubi", "netflix" (Movie of the Night)
  watchmodeSourceId: integer("watchmode_source_id"), // e.g. 345 (Watchmode source ID)
  createdAt: timestamp("created_at").defaultNow(),
});

// Mapping: a media item is available on a platform in a region. The link set
// for a (media, region) is replaced on each availability refresh (sync-on-refresh).
export const mediaLinks = pgTable(
  "media_links",
  {
    id: serial("id").primaryKey(),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    platformId: integer("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
    region: text("region").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    unique("media_links_unique").on(t.mediaId, t.platformId, t.region),
    // Serves the target query ("media on platform X in region Y"); the unique
    // index above leads with media_id and won't.
    index("media_links_platform_region_idx").on(t.platformId, t.region),
  ]
);

// Stripe subscription record — one per user. Absence = free tier.
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  status: text("status").notNull().default("active"), // active | canceled | past_due
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tracks when each platform+type was last synced from an external catalog API.
// Used to enforce per-platform cooldowns and track monthly MOTN quota spend.
export const catalogSyncLog = pgTable(
  "catalog_sync_log",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    mediaType: text("media_type").notNull(), // "movie" | "tv"
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
    itemCount: integer("item_count").notNull().default(0),
    callsUsed: integer("calls_used").notNull().default(0),
  },
  (t) => [unique("catalog_sync_log_unique").on(t.slug, t.mediaType)]
);

// --- Community free links ---------------------------------------------------
// User-submitted URLs pointing to free/legal streaming sources. Domain-validated
// against DOMAIN_ALLOWLIST at submission time; no admin queue needed.

export const communityLinks = pgTable(
  "community_links",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tmdbId: integer("tmdb_id").notNull(),
    tmdbType: text("tmdb_type").notNull(),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    label: text("label"),
    // V1 always writes "approved"; kept as admin escape hatch for future use.
    status: text("status").notNull().default("approved"),
    flagCount: integer("flag_count").notNull().default(0),
    submittedAt: timestamp("submitted_at").defaultNow(),
  },
  (t) => [
    unique("community_links_url_unique").on(t.tmdbId, t.tmdbType, t.url),
    index("community_links_media_idx").on(t.tmdbId, t.tmdbType),
  ]
);

// --- Growth / marketing automation tables -----------------------------------

// Discovered Reddit/Twitter threads where Sam can authentically engage.
// Populated daily by the GitHub Actions cron → /api/admin/growth/scan.
export const opportunities = pgTable(
  "opportunities",
  {
    id: serial("id").primaryKey(),
    platform: text("platform").notNull(), // "reddit" | "twitter"
    externalId: text("external_id").notNull(), // Reddit post ID, tweet ID
    url: text("url").notNull(),
    title: text("title"),
    body: text("body"),
    subreddit: text("subreddit"),
    author: text("author"),
    score: integer("score").notNull().default(0),
    foundAt: timestamp("found_at").notNull().defaultNow(),
    status: text("status").notNull().default("pending"), // pending | drafted | posted | dismissed
    draftResponse: text("draft_response"),
    postedAt: timestamp("posted_at"),
    postedUrl: text("posted_url"),
  },
  (t) => [unique("opportunities_external_id_unique").on(t.externalId)]
);

// Proactive social posts queued for Buffer (Twitter/X, etc.).
export const socialPosts = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // "twitter" | "linkedin"
  content: text("content").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  bufferId: text("buffer_id"),
  status: text("status").notNull().default("draft"), // draft | queued | posted
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per (user, link) — prevents a single user from filling the flag threshold.
export const communityLinkFlags = pgTable(
  "community_link_flags",
  {
    id: serial("id").primaryKey(),
    linkId: integer("link_id")
      .notNull()
      .references(() => communityLinks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    flaggedAt: timestamp("flagged_at").defaultNow(),
  },
  (t) => [unique("community_link_flags_unique").on(t.linkId, t.userId)]
);

// --- User-submitted suggestions ------------------------------------------

export const platformSuggestions = pgTable(
  "platform_suggestions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    websiteUrl: text("website_url"),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    adminNotes: text("admin_notes"),
    submittedAt: timestamp("submitted_at").defaultNow(),
  },
  (t) => [index("platform_suggestions_user_idx").on(t.userId)]
);

export const linkSuggestions = pgTable(
  "link_suggestions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tmdbId: integer("tmdb_id").notNull(),
    tmdbType: text("tmdb_type").notNull(),
    mediaTitle: text("media_title"),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    label: text("label"),
    status: text("status").notNull().default("pending"),
    adminNotes: text("admin_notes"),
    submittedAt: timestamp("submitted_at").defaultNow(),
  },
  (t) => [
    unique("link_suggestions_url_unique").on(t.tmdbId, t.tmdbType, t.url),
    index("link_suggestions_user_idx").on(t.userId),
  ]
);
