import { env } from "@/lib/env";

const SCRAPECREATORS_BASE = "https://api.scrapecreators.com";

export interface RedditThread {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  score: number;
  author: string;
  subreddit: string;
  created_utc: number;
}

export async function fetchNewPosts(
  subreddit: string,
  limit: number
): Promise<RedditThread[]> {
  if (!env.SCRAPECREATORS_API_KEY) {
    throw new Error("SCRAPECREATORS_API_KEY not configured");
  }

  const params = new URLSearchParams({ subreddit, sort: "new" });
  const res = await fetch(`${SCRAPECREATORS_BASE}/v1/reddit/subreddit?${params}`, {
    headers: { "x-api-key": env.SCRAPECREATORS_API_KEY },
  });

  if (!res.ok) throw new Error(`ScrapeCreators error ${res.status} for r/${subreddit}`);

  const data = (await res.json()) as { posts: RedditThread[] };
  return data.posts.slice(0, limit);
}

export async function postComment(): Promise<string> {
  throw new Error("Reddit comment posting is not yet supported via ScrapeCreators (read-only).");
}
