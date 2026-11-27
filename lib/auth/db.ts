import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { authChallenges, authSessions, users } from "@/db/schema";
import type { AuthChannel, UserRole } from "@/lib/types";

export interface AuthChallengeRow {
  id: string;
  channel: AuthChannel;
  identifier: string;
  code_hash: string;
  intended_role: UserRole;
  next_path: string | null;
  attempts: number;
  ip: string | null;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export interface CreateAuthChallengeInput {
  channel: AuthChannel;
  identifier: string;
  codeHash: string;
  intendedRole: UserRole;
  nextPath: string | null;
  ip: string | null;
  /** ISO timestamp. */
  expiresAt: string;
}

export async function createAuthChallenge(
  input: CreateAuthChallengeInput
): Promise<AuthChallengeRow> {
  const [row] = await db
    .insert(authChallenges)
    .values({
      id: `chal_${randomUUID()}`,
      channel: input.channel,
      identifier: input.identifier,
      code_hash: input.codeHash,
      intended_role: input.intendedRole,
      next_path: input.nextPath,
      ip: input.ip,
      expires_at: input.expiresAt,
    })
    .returning();
  return row;
}

export async function getAuthChallengeById(
  id: string
): Promise<AuthChallengeRow | null> {
  const [row] = await db
    .select()
    .from(authChallenges)
    .where(eq(authChallenges.id, id));
  return row ?? null;
}

export async function incrementChallengeAttempts(id: string): Promise<void> {
  await db
    .update(authChallenges)
    .set({ attempts: sql`${authChallenges.attempts} + 1` })
    .where(eq(authChallenges.id, id));
}

/** Returns true only for the single request that atomically consumes the link. */
export async function consumeAuthChallenge(id: string): Promise<boolean> {
  const rows = await db
    .update(authChallenges)
    .set({ consumed_at: new Date().toISOString() })
    .where(
      and(
        eq(authChallenges.id, id),
        isNull(authChallenges.consumed_at),
        gte(authChallenges.expires_at, new Date().toISOString())
      )
    )
    .returning({ id: authChallenges.id });
  return rows.length === 1;
}

export async function createPersistentSession(input: {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}): Promise<void> {
  await db.insert(authSessions).values({
    id: `sess_${randomUUID()}`,
    token_hash: input.tokenHash,
    user_id: input.userId,
    expires_at: input.expiresAt,
  });
}

export async function getPersistentSession(tokenHash: string) {
  const [row] = await db
    .select({
      userId: users.id,
      role: users.role,
      expiresAt: authSessions.expires_at,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.user_id, users.id))
    .where(
      and(
        eq(authSessions.token_hash, tokenHash),
        isNull(authSessions.revoked_at),
        gte(authSessions.expires_at, new Date().toISOString())
      )
    );
  return row ?? null;
}

export async function revokePersistentSession(tokenHash: string): Promise<void> {
  await db
    .update(authSessions)
    .set({ revoked_at: new Date().toISOString() })
    .where(
      and(eq(authSessions.token_hash, tokenHash), isNull(authSessions.revoked_at))
    );
}

/**
 * Most recent not-yet-consumed, not-yet-expired challenge for this
 * identifier+channel, if any — lets the caller skip minting (and
 * emailing) a brand new token when the last one it sent is still good.
 */
export async function getLatestActiveChallenge(
  identifier: string,
  channel: AuthChannel
): Promise<AuthChallengeRow | null> {
  const now = new Date().toISOString();
  const [row] = await db
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.identifier, identifier),
        eq(authChallenges.channel, channel),
        isNull(authChallenges.consumed_at),
        gte(authChallenges.expires_at, now)
      )
    )
    .orderBy(desc(authChallenges.created_at))
    .limit(1);
  return row ?? null;
}

/** Powers the per-identifier and per-IP rate limits on requesting a login link. */
export async function countRecentChallenges(params: {
  identifier?: string;
  ip?: string;
  sinceMinutesAgo: number;
}): Promise<number> {
  const since = new Date(
    Date.now() - params.sinceMinutesAgo * 60_000
  ).toISOString();

  const conditions = [gte(authChallenges.created_at, since)];
  if (params.identifier) {
    conditions.push(eq(authChallenges.identifier, params.identifier));
  }
  if (params.ip) {
    conditions.push(eq(authChallenges.ip, params.ip));
  }

  const [row] = await db
    .select({ count: count() })
    .from(authChallenges)
    .where(and(...conditions));
  return row?.count ?? 0;
}
