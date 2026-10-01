import nodemailer from "nodemailer";

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Shared SMTP transport for every outbound email this app sends — login
 * magic links (lib/auth/providers/email.ts) and job-alert notifications
 * (lib/job-alerts.ts). Centralized so both channels share one
 * missing-SMTP_URL guard instead of two copies drifting apart.
 *
 * Without SMTP_URL configured:
 *   - in production, this throws instead of pretending to send.
 *   - outside production (local dev, CI, this sandbox), it logs the
 *     message to the console instead — see README's "本地开发" section.
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  // info@dianpin.eu is the only mailbox this project actually owns — see
  // README's mail-setup section. Do not default to noreply@: that account
  // doesn't exist at the mail provider, and most SMTP providers reject
  // sending from an address they don't recognize.
  const from = process.env.EMAIL_FROM ?? "info@dianpin.eu";

  if (!smtpUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP_URL is not set — email cannot be sent. Configure it in " +
          "Railway's service Variables (see README's mail setup section)."
      );
    }
    console.log(`[mail] no SMTP_URL set — would send to ${input.to}:`);
    console.log(input.subject);
    console.log(input.text);
    return;
  }

  try {
    // createTransport() must be inside this try too, not just sendMail():
    // a malformed SMTP_URL (e.g. an unencoded `@` or `#` in the username/
    // password) makes it throw synchronously with the *raw URL — password
    // included — attached as the error's `input` property. That error
    // previously escaped this function uncaught and got logged verbatim
    // further up the call stack (app/auth-actions.ts), which really
    // happened once in production and put a live SMTP password in
    // Railway's plaintext logs. Never let that error out unmasked again.
    const transporter = nodemailer.createTransport(smtpUrl);
    await transporter.sendMail({ from, ...input });
  } catch (err) {
    const domain = input.to.split("@")[1] ?? "unknown";
    const safeMessage =
      err instanceof Error
        ? // Error.message for a bad-URL TypeError is just "Invalid URL" —
          // the dangerous part lives on a separate `.input` property that
          // this intentionally never touches or logs.
          err.message
        : "non-Error value thrown";
    console.error(
      `[mail] sendMail failed for identifier ending in @${domain}: ${safeMessage}`
    );
    throw new Error(`Failed to send mail: ${safeMessage}`);
  }
}
