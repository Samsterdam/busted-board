import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, watched, dismissedItems, feedCache } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  getTrendingMovies,
  discoverMovies,
  getTrendingShows,
  discoverShows,
  type TmdbMovie,
  type TmdbShow,
} from "@/lib/tmdb";
import { YEAR_PREFIX_LENGTH } from "@/lib/config/feed";
import { QUIZ_SIZE, QUIZ_LIKE_RATING, QUIZ_DISLIKE_RATING, QUIZ_MAX_ANSWERS } from "@/lib/config/quiz";
import { TITLE_MAX_LENGTH, RATING_SOURCE_QUIZ } from "@/lib/config/ratings";

interface QuizItem {
  id: number;
  type: "movie" | "tv";
  title: string;
  year: string;
  posterPath: string | null;
}

// GET → a fresh set of recognizable titles (movies + TV shows) to quiz on,
// excluding anything the user has already rated, marked seen, or dismissed.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [ratedRows, watchedRows, dismissedRows] = await Promise.all([
    db.select({ tmdbId: ratings.tmdbId, tmdbType: ratings.tmdbType }).from(ratings).where(eq(ratings.userId, userId)),
    db.select({ tmdbId: watched.tmdbId, tmdbType: watched.tmdbType }).from(watched).where(eq(watched.userId, userId)),
    db.select({ tmdbId: dismissedItems.tmdbId, tmdbType: dismissedItems.tmdbType }).from(dismissedItems).where(eq(dismissedItems.userId, userId)),
  ]);

  // Composite key prevents a dismissed movie from blocking a TV show with the
  // same numeric TMDB ID (movies and TV share the same ID namespace in TMDB).
  const known = new Set<string>([
    ...ratedRows.map((r) => `${r.tmdbId}-${r.tmdbType}`),
    ...watchedRows.map((r) => `${r.tmdbId}-${r.tmdbType}`),
    ...dismissedRows.map((r) => `${r.tmdbId}-${r.tmdbType}`),
  ]);

  // Four parallel buckets: trending + acclaimed for both movies and TV.
  const [trendingMovies, acclaimedMovies, trendingShows, acclaimedShows] = await Promise.all([
    getTrendingMovies().then((r) => r.results ?? []).catch(() => [] as TmdbMovie[]),
    discoverMovies({ sort_by: "popularity.desc", "vote_count.gte": "1000" })
      .then((r) => r.results ?? []).catch(() => [] as TmdbMovie[]),
    getTrendingShows().then((r) => r.results ?? []).catch(() => [] as TmdbShow[]),
    discoverShows({ sort_by: "popularity.desc", "vote_count.gte": "500" })
      .then((r) => r.results ?? []).catch(() => [] as TmdbShow[]),
  ]);

  const movieItems: QuizItem[] = [];
  const seenMovies = new Set<string>();
  for (const m of [...trendingMovies, ...acclaimedMovies]) {
    const key = `${m.id}-movie`;
    if (seenMovies.has(key) || known.has(key) || !m.title) continue;
    seenMovies.add(key);
    movieItems.push({
      id: m.id,
      type: "movie",
      title: m.title,
      year: (m.release_date ?? "").slice(0, YEAR_PREFIX_LENGTH),
      posterPath: m.poster_path,
    });
  }

  const tvItems: QuizItem[] = [];
  const seenShows = new Set<string>();
  for (const s of [...trendingShows, ...acclaimedShows]) {
    const key = `${s.id}-tv`;
    if (seenShows.has(key) || known.has(key) || !s.name) continue;
    seenShows.add(key);
    tvItems.push({
      id: s.id,
      type: "tv",
      title: s.name,
      year: (s.first_air_date ?? "").slice(0, YEAR_PREFIX_LENGTH),
      posterPath: s.poster_path,
    });
  }

  // Interleave movies and TV so both types appear regardless of bucket size.
  const items: QuizItem[] = [];
  const maxLen = Math.max(movieItems.length, tvItems.length);
  for (let i = 0; i < maxLen && items.length < QUIZ_SIZE; i++) {
    if (i < movieItems.length && items.length < QUIZ_SIZE) items.push(movieItems[i]);
    if (i < tvItems.length  && items.length < QUIZ_SIZE) items.push(tvItems[i]);
  }

  return Response.json({ items });
}

interface QuizAnswer {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  verdict: "like" | "dislike";
}

// POST → record quiz verdicts as ratings (like = top of scale, dislike = floor).
// "Haven't seen" answers are simply omitted by the client. Existing ratings are
// left untouched — a quiz tap must not clobber a deliberate star rating.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { answers } = (await request.json()) as { answers: QuizAnswer[] };
  if (!Array.isArray(answers) || answers.length === 0) {
    return Response.json({ error: "No answers" }, { status: 400 });
  }
  if (answers.length > QUIZ_MAX_ANSWERS) {
    return Response.json({ error: "Too many answers" }, { status: 400 });
  }

  const existingRows = await db
    .select({ tmdbId: ratings.tmdbId })
    .from(ratings)
    .where(eq(ratings.userId, userId));
  const alreadyRated = new Set(existingRows.map((r) => r.tmdbId));

  const toInsert = answers
    .filter((a) => a.tmdbId && (a.verdict === "like" || a.verdict === "dislike"))
    .filter((a) => a.tmdbType === "movie" || a.tmdbType === "tv")
    .filter((a) => typeof a.title === "string" && a.title.length > 0 && a.title.length <= TITLE_MAX_LENGTH)
    .filter((a) => !alreadyRated.has(a.tmdbId))
    .map((a) => ({
      userId,
      tmdbId: a.tmdbId,
      tmdbType: a.tmdbType,
      title: a.title,
      posterPath: a.posterPath ?? null,
      rating: a.verdict === "like" ? QUIZ_LIKE_RATING : QUIZ_DISLIKE_RATING,
      watchStatus: "watched" as const,
      source: RATING_SOURCE_QUIZ,
    }));

  if (toInsert.length > 0) {
    await db.insert(ratings).values(toInsert);
    await db.delete(feedCache).where(eq(feedCache.userId, userId));
  }

  return Response.json({ ok: true, inserted: toInsert.length });
}
