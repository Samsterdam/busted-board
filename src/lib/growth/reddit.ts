import { env } from "@/lib/env";
import { MS_PER_MINUTE, MS_PER_SECOND } from "@/lib/config/durations";

const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_OAUTH_BASE = "https://oauth.reddit.com";
const USER_AGENT = "BustedBoard/1.0 (growth automation; operated by account owner)";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - MS_PER_MINUTE) {
    return cachedToken.value;
  }

  if (
    !env.REDDIT_CLIENT_ID ||
    !env.REDDIT_CLIENT_SECRET ||
    !env.REDDIT_USERNAME ||
    !env.REDDIT_PASSWORD
  ) {
    throw new Error("Reddit OAuth credentials not configured");
  }

  const credentials = Buffer.from(
    `${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: env.REDDIT_USERNAME,
      password: env.REDDIT_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new Error(`Reddit token request failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * MS_PER_SECOND,
  };
  return cachedToken.value;
}

async function redditFetch(path: string): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${REDDIT_OAUTH_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`Reddit API error ${res.status} for ${path}`);
  return res.json();
}

async function redditPost(path: string, body: Record<string, string>): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${REDDIT_OAUTH_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`Reddit POST error ${res.status} for ${path}`);
  return res.json();
}

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

export async function searchSubreddit(
  subreddit: string,
  query: string,
  limit: number
): Promise<RedditThread[]> {
  const params = new URLSearchParams({
    q: query,
    restrict_sr: "true",
    sort: "new",
    limit: String(limit),
    t: "week",
  });

  const data = (await redditFetch(
    `/r/${subreddit}/search?${params}`
  )) as { data: { children: { data: RedditThread }[] } };

  return data.data.children.map((c) => c.data);
}

export async function postComment(
  threadId: string,
  text: string
): Promise<string> {
  const data = (await redditPost("/api/comment", {
    api_type: "json",
    thing_id: `t3_${threadId}`,
    text,
  })) as { json: { data: { things: { data: { permalink: string } }[] } } };

  const permalink = data.json?.data?.things?.[0]?.data?.permalink;
  if (!permalink) throw new Error("Reddit comment post returned no permalink");
  return `https://reddit.com${permalink}`;
}
