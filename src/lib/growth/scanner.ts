import { db } from "@/lib/db";
import { opportunities } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { searchSubreddit } from "@/lib/growth/reddit";
import {
  GROWTH_SUBREDDITS,
  GROWTH_KEYWORDS,
  GROWTH_MIN_SCORE,
  GROWTH_MAX_OPPORTUNITIES_PER_RUN,
  GROWTH_MAX_THREAD_AGE_HOURS,
  GROWTH_SEARCH_LIMIT,
  GROWTH_MAX_BODY_LENGTH,
} from "@/lib/config/growth";
import { MS_PER_HOUR, MS_PER_SECOND } from "@/lib/config/durations";

const MAX_AGE_MS = GROWTH_MAX_THREAD_AGE_HOURS * MS_PER_HOUR;

export async function runScanner(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const subreddit of GROWTH_SUBREDDITS) {
    if (inserted >= GROWTH_MAX_OPPORTUNITIES_PER_RUN) break;

    for (const keyword of GROWTH_KEYWORDS) {
      if (inserted >= GROWTH_MAX_OPPORTUNITIES_PER_RUN) break;

      let threads;
      try {
        threads = await searchSubreddit(subreddit, keyword, GROWTH_SEARCH_LIMIT);
      } catch {
        continue;
      }

      for (const thread of threads) {
        const ageMs = Date.now() - thread.created_utc * MS_PER_SECOND;
        if (thread.score < GROWTH_MIN_SCORE || ageMs > MAX_AGE_MS) {
          skipped++;
          continue;
        }

        const existing = await db
          .select({ id: opportunities.id })
          .from(opportunities)
          .where(eq(opportunities.externalId, thread.id))
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        try {
          await db.insert(opportunities).values({
            platform: "reddit",
            externalId: thread.id,
            url: `https://reddit.com${thread.permalink}`,
            title: thread.title,
            body: thread.selftext?.slice(0, GROWTH_MAX_BODY_LENGTH) || null,
            subreddit: thread.subreddit,
            author: thread.author,
            score: thread.score,
          });
          inserted++;
        } catch {
          // Unique constraint race — another concurrent run beat us to it
          skipped++;
        }
      }
    }
  }

  return { inserted, skipped };
}
