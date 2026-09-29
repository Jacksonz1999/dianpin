import type { AuthChannel } from "@/lib/types";

export interface DeliverCodeInput {
  /** Email address or phone number, depending on channel. */
  identifier: string;
  /** Raw single-use code/token (already generated — providers never mint their own). */
  code: string;
  /** Clickable verification URL, for channels that prefer a link over a typed code. */
  verifyUrl: string;
}

/**
 * The only thing that differs between login channels: how to hand the
 * user their code. Challenge creation, hashing, expiry and rate limiting
 * are generic and live in lib/db.ts / app/auth-actions.ts — they don't
 * know or care which provider is active.
 */
export interface AuthProvider {
  readonly channel: AuthChannel;
  deliverCode(input: DeliverCodeInput): Promise<void>;
}
