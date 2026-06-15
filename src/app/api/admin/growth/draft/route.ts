import { auth } from "@/auth";
import { db } from "@/lib/db";
import { opportunities } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GROWTH_GEMINI_MODEL } from "@/lib/config/growth";

const SYSTEM_PROMPT = `You are helping Sam, the founder of Busted Board, draft authentic Reddit replies.

About Busted Board:
- AI-powered streaming recommendation engine (gemini-powered taste profiles)
- Tells you what to watch on the streaming services you actually subscribe to
- No sponsored results, no paid placements — unlike JustWatch which sells "Sponsored Recommendations"
- Freemium: free tier, $3/mo or $25/yr for unlimited watchlist + features
- Live at busted-board.vercel.app (custom domain coming soon)

Voice guidelines:
- Genuine, helpful, not salesy — lead with value, mention Busted Board naturally if relevant
- Disclose that Sam is the creator when mentioning the app ("I built this..." or "full disclosure, I made this...")
- Match the tone of the thread — casual subreddits get casual language
- Never spam; if the thread isn't a good fit, say so and Sam will dismiss it
- Short replies land better than walls of text

Sam will tell you what angle he wants to take. Draft a reply based on the thread context above and his direction.`;

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
