import type { AuthProvider } from "./types";

/**
 * Reserved slot, not implemented. AGENTS.md §4 ranks WhatsApp OTP as the
 * long-term preferred channel — about $0.02/message in Spain vs Twilio
 * SMS's ~$0.0875, and it's where the target users (Spain's Chinese
 * community) already are — but it needs a WhatsApp Business API
 * integration (Cloud API or a BSP like Twilio) that this project doesn't
 * have credentials for yet.
 *
 * To wire it up: implement `deliverCode` using the WhatsApp Business
 * Cloud API's message-template send endpoint (an OTP template, not a
 * clickable link — WhatsApp doesn't do magic links well), reading
 * WHATSAPP_TOKEN the way AGENTS.md §7 already reserves for it. No other
 * code needs to change: lib/auth/providers/index.ts picks this up the
 * moment AUTH_PROVIDER=whatsapp is set, and the login page. app/auth
 * routes and challenge/rate-limit logic are all channel-agnostic already.
 */
export const whatsappProvider: AuthProvider = {
  channel: "whatsapp",

  async deliverCode(): Promise<void> {
    throw new Error(
      "AUTH_PROVIDER=whatsapp is not implemented yet — see lib/auth/providers/whatsapp.ts. Use AUTH_PROVIDER=email for now."
    );
  },
};
