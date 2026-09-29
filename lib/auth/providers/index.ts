import type { AuthChannel } from "@/lib/types";
import { emailProvider } from "./email";
import { whatsappProvider } from "./whatsapp";
import type { AuthProvider } from "./types";

const PROVIDERS: Record<AuthChannel, AuthProvider> = {
  email: emailProvider,
  whatsapp: whatsappProvider,
};

/** Selected by the AUTH_PROVIDER env var (AGENTS.md §7); defaults to "email". */
export function getAuthProvider(): AuthProvider {
  const channel = (process.env.AUTH_PROVIDER as AuthChannel | undefined) ?? "email";
  const provider = PROVIDERS[channel];
  if (!provider) {
    throw new Error(`Unsupported AUTH_PROVIDER: "${channel}"`);
  }
  return provider;
}

export type { AuthProvider, DeliverCodeInput } from "./types";
