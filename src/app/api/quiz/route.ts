import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ratings, watched, dismissedItems, feedCache } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getTrendingMovies, discoverMovies, type TmdbMovie } from "@/lib/tmdb";
import { YEAR_PREFIX_LENGTH } from "@/lib/config/feed";
import { QUIZ_SIZE, QUIZ_LIKE_RATING, QUIZ_DISLIKE_RATING, QUIZ_MAX_ANSWERS } from "@/lib/config/quiz";
import { TITLE_MAX_LENGTH, RATING_SOURCE_QUIZ } from "@/lib/config/ratings";

interface QuizItem {
  id: number;
  type: "movie";
  title: string;
  year: string;
  posterPath: string | null;
}

// GET → a fresh set of recognizable titles to quiz on, excluding anything the
// user has already rated, marked seen, or dismissed (no point asking about
// titles we already have a signal for).
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [ratedRows, watchedRows, dismissedRows] = await Promise.all([
    db.select({ tmdbId: ratings.tmdbId }).from(ratings).where(eq(ratings.userId, userId)),
    db.select({ tmdbId: watched.tmdbId }).from(watched).where(eq(watched.userId, userId)),
    db.select({ tmdbId: dismissedItems.tmdbId }).from(dismissedItems).where(eq(dismissedItems.userId, userId)),
  ]);
  const known = new Set<number>([
    ...ratedRows.map((r) => r.tmdbId),
    ...watchedRows.map((r) => r.tmdbId),
    ...dismissedRows.map((r) => r.tmdbId),
  ]);

  // Trending + a high-vote-count bucket → broadly recognizable titles people are
  // likely to have an opinion on. Best-effort; an empty bucket just shrinks the set.
  const [trending, acclaimed] = await Promise.all([
    getTrendingMovies().then((r) => r.results ?? []).catch(() => []),
    discoverMovies({ sort_by: "popularity.desc", "vote_count.gte": "1000" })
      .then((r) => r.results ?? [])
      .catch(() => []),
  ]);

  const seen = new Set<number>();
  const items: QuizItem[] = [];
  for (const m of [...trending, ...acclaimed] as TmdbMovie[]) {
    if (seen.has(m.id) || known.has(m.id) || !m.title) continue;
    seen.add(m.id);
    items.push({
      id: m.id,
      type: "movie",
      title: m.title,
      year: (m.release_date ?? "").slice(0, YEAR_PREFIX_LENGTH),
      posterPath: m.poster_path,
    });
    if (items.length >= QUIZ_SIZE) break;
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
      watchStatus: "watched",
      source: RATING_SOURCE_QUIZ,
    }));

  if (toInsert.length > 0) {
    await db.insert(ratings).values(toInsert);
    await db.delete(feedCache).where(eq(feedCache.userId, userId));
  }

  return Response.json({ ok: true, inserted: toInsert.length });
}
