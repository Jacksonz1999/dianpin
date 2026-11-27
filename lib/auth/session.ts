import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRequestLocale } from "@/lib/locale-server";
import { localePath } from "@/lib/locale-routing";
import type { UserRole } from "@/lib/types";
import {
  createPersistentSession,
  getPersistentSession,
  revokePersistentSession,
} from "./db";

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

function hashSessionToken(token: string): string {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

/** Sets the session cookie. Only callable from a Server Action or Route Handler. */
export async function createSession(
  userId: string
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_SECONDS * 1000
  ).toISOString();
  await createPersistentSession({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt,
  });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
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
  const session = await getPersistentSession(hashSessionToken(token));
  if (!session) return null;
  return {
    userId: session.userId,
    role: session.role,
    exp: Math.floor(new Date(session.expiresAt).getTime() / 1000),
  };
}

/** Clears the session cookie (logout). Only callable from a Server Action or Route Handler. */
export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) await revokePersistentSession(hashSessionToken(token));
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
    const locale = await getRequestLocale();
    const localizedNext = nextPath ? localePath(nextPath, locale) : null;
    const qs = localizedNext
      ? `?next=${encodeURIComponent(localizedNext)}`
      : "";
    redirect(localePath(`/login${qs}`, locale));
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
    const locale = await getRequestLocale();
    const params = new URLSearchParams();
    params.set("role", role);
    if (nextPath) params.set("next", localePath(nextPath, locale));
    redirect(localePath(`/login?${params.toString()}`, locale));
  }
  if (session.role !== role) {
    const locale = await getRequestLocale();
    redirect(
      localePath(`/role-mismatch?needed=${role}&have=${session.role}`, locale)
    );
  }
  return session;
}
