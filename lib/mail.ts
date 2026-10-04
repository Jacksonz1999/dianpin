import { Resend } from "resend";

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Shared email sender for every outbound email this app sends — login
 * magic links (lib/auth/providers/email.ts) and job-alert notifications
 * (lib/job-alerts.ts). Centralized so both channels share one
 * missing-config guard instead of two copies drifting apart.
 *
 * Uses the Resend HTTPS API, not raw SMTP — see README's mail setup
 * section for why: Railway's Hobby plan disables outbound SMTP entirely
 * (confirmed via Railway's own docs), so a generic nodemailer+SMTP_URL
 * setup can never work there. Resend talks HTTPS (port 443), which no
 * PaaS blocks.
 *
 * Without RESEND_API_KEY configured:
 *   - in production, this throws instead of pretending to send.
 *   - outside production (local dev, CI, this sandbox), it logs the
 *     message to the console instead — see README's "本地开发" section.
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  // info@dianpin.eu is the only mailbox this project actually owns — see
  // README's mail-setup section. Do not default to noreply@: that account
  // doesn't exist, and sending "from" an address whose domain isn't
  // verified in Resend gets rejected.
  const from = process.env.EMAIL_FROM ?? "info@dianpin.eu";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is not set — email cannot be sent. Configure it in " +
          "Railway's service Variables (see README's mail setup section)."
      );
    }
    console.log(`[mail] no RESEND_API_KEY set — would send to ${input.to}:`);
    console.log(input.subject);
    console.log(input.text);
    return;
  }

  const domain = input.to.split("@")[1] ?? "unknown";
  const resend = new Resend(apiKey);

  // Resend's SDK resolves (not rejects) on an API-level error, putting it
  // in `error` instead — but a network-level failure (fetch itself
  // throwing) still rejects, so both paths are handled and funneled
  // through the same masked log + sanitized throw. Never log/rethrow the
  // raw error or response object — see lib/mail.ts's git history (a
  // malformed SMTP_URL once leaked a password into Railway's logs this
  // same way, via an unguarded raw-error log elsewhere in this codebase).
  let errorMessage: string | null = null;
  // Resend's ErrorResponse.name is a closed union (RESEND_ERROR_CODE_KEY,
  // see node_modules/resend/dist/index.d.mts) — classifying on it is what
  // lets the Railway logs actually say "key 无效" vs "域名未验证" instead
  // of collapsing everything into one "Invalid URL"-style message (round
  // 8: that single generic string was all production logs showed, with
  // no way to tell which of several unrelated causes it was).
  let errorCode: string | null = null;
  try {
    const { error } = await resend.emails.send({ from, ...input });
    if (error) {
      errorMessage = error.message;
      errorCode = error.name;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "non-Error value thrown";
    errorCode = "network_error";
  }

  if (errorMessage) {
    const category = classifyMailErrorCode(errorCode);
    console.error(
      `[mail] sendMail failed for identifier ending in @${domain} ` +
        `(category=${category}, resendCode=${errorCode ?? "unknown"}): ${errorMessage}`
    );
    throw new Error(`Failed to send mail (${category}): ${errorMessage}`);
  }
}

/**
 * Maps Resend's error `name` to one of a handful of actionable buckets, so
 * whoever reads the Railway logs can tell "key 配错" apart from "域名没在
 * Resend 验证" apart from "纯网络问题" without having to go look up what
 * each Resend error code means. Exported for lib/mail.ts's own tests/PR
 * verification only — not used elsewhere.
 */
export function classifyMailErrorCode(code: string | null): string {
  if (code === "network_error") return "network_error";
  switch (code) {
    case "missing_api_key":
    case "invalid_api_key":
    case "restricted_api_key":
      return "invalid_key";
    case "invalid_from_address":
    case "invalid_access":
      return "domain_not_verified";
    case "rate_limit_exceeded":
    case "monthly_quota_exceeded":
    case "daily_quota_exceeded":
      return "quota_or_rate_limit";
    default:
      return "api_error";
  }
}
