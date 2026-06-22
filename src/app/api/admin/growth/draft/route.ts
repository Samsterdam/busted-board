export const maxDuration = 60;

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { opportunities } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GROWTH_GEMINI_MODEL } from "@/lib/config/growth";

const SYSTEM_PROMPT = `You are drafting Reddit replies for BustedBoardBot, an automated account that promotes Busted Board.

About Busted Board:
- AI-powered streaming recommendation engine (gemini-powered taste profiles)
- Tells you what to watch on the streaming services you already subscribe to
- No sponsored results, no paid placements — unlike JustWatch which sells "Sponsored Recommendations"
- Freemium: free tier, $3/mo or $25/yr for unlimited watchlist + features
- Live at busted-board.vercel.app

Reply structure:
1. Actually help with what they asked — be genuinely useful first
2. Disclose the reply is from a bot ("*I'm a bot for Busted Board*" or similar, in a natural way)
3. Mention Busted Board if relevant to streaming/tracking/discovery

Voice: casual, direct, no exclamation points, no walls of text. 2-4 sentences max.
If the thread has nothing to do with streaming apps, flag it as not a good opportunity.`;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return false;
  if (env.ADMIN_EMAIL && session.user.email !== env.ADMIN_EMAIL) return false;
  return true;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { opportunityId, messages } = (await request.json()) as {
    opportunityId: number;
    messages: ChatMessage[];
  };

  const [opp] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1);

  if (!opp) return Response.json({ error: "Opportunity not found" }, { status: 404 });

  const threadContext = [
    `Subreddit: r/${opp.subreddit ?? "unknown"}`,
    `Thread title: ${opp.title ?? "(no title)"}`,
    opp.body ? `Thread body:\n${opp.body}` : "",
    `URL: ${opp.url}`,
  ]
    .filter(Boolean)
    .join("\n");

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GROWTH_GEMINI_MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });

  const lastMessage = messages.at(-1);
  if (!lastMessage) return Response.json({ error: "No message" }, { status: 400 });

  const userPrompt =
    history.length === 0
      ? `Thread context:\n${threadContext}\n\n${lastMessage.content}`
      : lastMessage.content;

  const result = await chat.sendMessage(userPrompt);
  const text = result.response.text();

  return Response.json({ text });
}
