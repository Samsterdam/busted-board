import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "bb_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getOrCreateUser() {
  const cookieStore = await cookies();
  let userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (userId) {
    const existing = db.select().from(users).where(eq(users.id, userId)).get();
    if (existing) return existing;
  }

  userId = uuidv4();
  db.insert(users).values({ id: userId }).run();

  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR,
    path: "/",
  });

  return db.select().from(users).where(eq(users.id, userId)).get()!;
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export function getUserIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}
