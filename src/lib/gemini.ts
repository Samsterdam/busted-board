import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./env";
import { GEMINI_RETRY_BACKOFF_MS } from "./config/durations";
import { MIN_RATINGS_FOR_PROFILE } from "./config/ratings";
import { FALLBACK_RANK_LIMIT } from "./config/feed";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Note: gemini-1.5-* models are retired (404), and 2.5-pro has no free-tier
// quota (429). gemini-2.5-flash is current and available on the free key, so
// both slots use it. Swap `pro` to "gemini-2.5-pro" if a paid key is set.
const flash = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
});

const pro = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
});

async function callGemini(model: typeof flash, prompt: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, GEMINI_RETRY_BACKOFF_MS * (attempt + 1)));
    }
  }
  throw new Error("Gemini call failed after retries");
}

function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

// --- Types ---

export interface TasteProfileResult {
  top_themes: string[];
  avoid_themes: string[];
  fav_directors: string[];
  fav_actors: string[];
  tone_description: string;
  recommendation_strategy: string;
}

export interface RankedRecommendation {
  tmdb_id: number;
  rank: number;
  why_youll_like_this: string;
}

export interface SearchQueryInterpretation {
  search_term: string | null;
  genres: string[];
  min_vote_average: number;
  sort_by: string;
  keywords: string[];
  explanation: string;
}

// --- Taste Profile ---

interface RatingInput {
  title: string;
  year: string;
  rating: number;
  notes?: string | null;
  genres: string[];
}

export async function generateTasteProfile(
  ratings: RatingInput[]
): Promise<TasteProfileResult | null> {
  if (ratings.length < MIN_RATINGS_FOR_PROFILE) return null;

  const prompt = `You are a film critic analyzing someone's movie and TV taste.

Here are all the movies and shows this person has rated (1=hated, 5=loved):
${JSON.stringify(ratings)}

Analyze their taste and return a JSON object with exactly these fields:
{
  "top_themes": string[],
  "avoid_themes": string[],
  "fav_directors": string[],
  "fav_actors": string[],
  "tone_description": string,
  "recommendation_strategy": string
}

Rules:
- top_themes: 3-6 specific themes they consistently enjoy (e.g. "cerebral sci-fi", "slow burn drama")
- avoid_themes: 2-4 things they seem to dislike based on low ratings
- fav_directors: directors that appear or whose style they clearly love
- fav_actors: recurring actors in titles they rated highly
- tone_description: 2-3 sentences describing their overall taste in plain English
- recommendation_strategy: 1 sentence on what to look for when recommending to this person

Be specific and grounded in the data. Do not invent preferences not supported by the ratings.`;

  try {
    const text = await callGemini(pro, prompt);
    const result = safeParseJSON<TasteProfileResult | null>(text, null);
    if (!result || !result.top_themes || !result.tone_description) return null;
    return result;
  } catch {
    return null;
  }
}

// --- Feed Ranking ---

interface CandidateInput {
  tmdb_id: number;
  title: string;
  year: string;
  genres: string[];
  overview: string;
  vote_average: number;
  popularity: number;
  original_language: string;
  platforms: string[];
}

export async function rankRecommendations(
  profile: TasteProfileResult,
  candidates: CandidateInput[]
): Promise<RankedRecommendation[]> {
  const prompt = `You are a movie recommendation engine.

User taste profile:
${JSON.stringify(profile)}

Candidate movies/shows (pick the best 10 for this user):
${JSON.stringify(candidates)}

Return a JSON array of exactly 10 items (or fewer if fewer candidates):
[{ "tmdb_id": number, "rank": number, "why_youll_like_this": string }]

Rules:
- rank 1 = best match
- why_youll_like_this: 1-2 sentences connecting this title to the user's specific taste
- Prioritize items with vote_average >= 7.0 AND popularity < 30 (hidden gems)
- Only include tmdb_id values from the candidates list above
- The response must be valid JSON array only`;

  const fallback = candidates
    .slice(0, FALLBACK_RANK_LIMIT)
    .map((c, i) => ({
      tmdb_id: c.tmdb_id,
      rank: i + 1,
      why_youll_like_this: "Highly rated and matches your streaming services.",
    }));

  try {
    const text = await callGemini(flash, prompt);
    const result = safeParseJSON<RankedRecommendation[]>(text, fallback);
    if (!Array.isArray(result) || result.length === 0) return fallback;
    return result;
  } catch {
    return fallback;
  }
}

// --- Chat/Search Query Interpretation ---

export async function interpretSearchQuery(
  query: string,
  profile: TasteProfileResult | null
): Promise<SearchQueryInterpretation> {
  const fallback: SearchQueryInterpretation = {
    search_term: query,
    genres: [],
    min_vote_average: 6.0,
    sort_by: "popularity.desc",
    keywords: [],
    explanation: `Searching for: ${query}`,
  };

  const prompt = `You are helping someone find a movie or TV show to watch.

Their query: "${query}"

Their taste profile (may be null):
${JSON.stringify(profile)}

Interpret the query and return a JSON object:
{
  "search_term": string | null,
  "genres": string[],
  "min_vote_average": number,
  "sort_by": "popularity.desc" | "vote_average.desc" | "primary_release_date.desc",
  "keywords": string[],
  "explanation": string
}

Rules:
- search_term: if they named a specific title or director, put it here; otherwise null
- genres: TMDB genre names that match the mood/request (Action, Comedy, Drama, etc.)
- min_vote_average: 6.0 for casual, 7.0 for quality-focused, 7.5 for prestige
- keywords: thematic keywords to search for (e.g. "time travel", "heist", "found family")
- explanation: 1 sentence describing what you understood from the query`;

  try {
    const text = await callGemini(flash, prompt);
    const result = safeParseJSON<SearchQueryInterpretation>(text, fallback);
    if (!result || typeof result.explanation !== "string") return fallback;
    return result;
  } catch {
    return fallback;
  }
}
