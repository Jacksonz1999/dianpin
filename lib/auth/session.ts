import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types";

const COOKIE_NAME = "dianpin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  role: UserRole;
  /** Unix seconds. */
  exp: number;
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Copy .env.example to .env and fill it in."
    );
  }
  return secret;
}

function signPayload(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getAuthSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = createHmac("sha256", getAuthSecret())
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Sets the session cookie. Only callable from a Server Action or Route Handler. */
export async function createSession(
  userId: string,
  role: UserRole
): Promise<void> {
  const payload: SessionPayload = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const jar = await cookies();
  jar.set(COOKIE_NAME, signPayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Reads and verifies the session cookie. Safe to call from Server Components. */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Clears the session cookie (logout). Only callable from a Server Action or Route Handler. */
export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * Redirects to /login (preserving `nextPath` to return to after login) if
 * there's no session. Used at the top of every page/action that requires
 * being signed in, regardless of role.
 */
export async function requireSession(
  nextPath?: string
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    const qs = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${qs}`);
  }
  return session;
}

/**
 * Like requireSession, but also enforces the session's role.
 *
 * Not-logged-in case: redirects to /login with both `next` (so the
 * post-login redirect in app/auth/callback/route.ts lands back here) and
 * `role` (so the login form's 求职者/雇主 toggle starts on the right
 * side — see components/LoginForm.tsx's defaultRole prop) — a visitor
 * who clicked "我是店主" shouldn't have to notice and flip a toggle too.
 *
 * Wrong-role case (e.g. a seeker-role account hitting /employer):
 * redirects to /role-mismatch (not back to / with a banner — WP-K, round
 * 10) with `needed`/`have` so that page can say plainly which account
 * this is and that the other role needs a separate account. This does
 * NOT change anyone's role and never will — one account, one role, is a
 * settled product decision (see AGENTS.md §6 and components/
 * EmployerMeView.tsx's note on it); there is no "add employer role to my
 * account" flow to build here, only an honest explanation of the
 * boundary.
 */
export async function requireRole(
  role: UserRole,
  nextPath?: string
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    const params = new URLSearchParams();
    params.set("role", role);
    if (nextPath) params.set("next", nextPath);
    redirect(`/login?${params.toString()}`);
  }
  if (session.role !== role) {
    redirect(`/role-mismatch?needed=${role}&have=${session.role}`);
  }
  return session;
}
