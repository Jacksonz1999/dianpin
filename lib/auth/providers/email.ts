import { getSiteUrl } from "@/lib/site-url";
import { sendMail } from "@/lib/mail";
import type { AuthProvider, DeliverCodeInput } from "./types";

/**
 * v1's active provider (AGENTS.md §4 picks email magic links as the
 * channel that actually ships, since Spain's new SMS Sender ID rules make
 * plain SMS impractical and WhatsApp isn't wired up yet).
 *
 * The actual SMTP transport and its missing-SMTP_URL / production-throw
 * guard live in lib/mail.ts, shared with job-alert notifications — see
 * that file for the exact fallback behavior (throws in production, logs
 * to console otherwise).
 */
export const emailProvider: AuthProvider = {
  channel: "email",

  async deliverCode({ identifier, verifyUrl }: DeliverCodeInput): Promise<void> {
    await sendMail({
      to: identifier,
      subject: "登录店聘 DianPin / Iniciar sesión en DianPin",
      text: [
        "点击链接登录店聘（15 分钟内有效，只能使用一次）：",
        verifyUrl,
        "",
        "Haz clic para iniciar sesión en DianPin (válido 15 minutos, un solo uso):",
        verifyUrl,
      ].join("\n"),
      html: [
        // A recognizable logo header makes this read as a real product
        // email rather than a bare link, which is exactly what phishing
        // mail looks like without one.
        `<p><img src="${getSiteUrl()}/brand-mark.png" alt="店聘 DianPin" width="48" height="48" /></p>`,
        "<p>点击链接登录店聘（15 分钟内有效，只能使用一次）：</p>",
        `<p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        "<hr/>",
        "<p>Haz clic para iniciar sesión en DianPin (válido 15 minutos, un solo uso):</p>",
        `<p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
      ].join(""),
    });
  },
};
