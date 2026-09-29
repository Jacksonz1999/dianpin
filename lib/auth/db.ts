import { randomUUID } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { authChallenges } from "@/db/schema";
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
  const existing = await getAuthChallengeById(id);
  if (!existing) return;
  await db
    .update(authChallenges)
    .set({ attempts: existing.attempts + 1 })
    .where(eq(authChallenges.id, id));
}

export async function consumeAuthChallenge(id: string): Promise<void> {
  await db
    .update(authChallenges)
    .set({ consumed_at: new Date().toISOString() })
    .where(eq(authChallenges.id, id));
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
