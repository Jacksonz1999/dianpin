import nodemailer from "nodemailer";
import { getSiteUrl } from "@/lib/site-url";
import type { AuthProvider, DeliverCodeInput } from "./types";

/**
 * v1's active provider (AGENTS.md §4 picks email magic links as the
 * channel that actually ships, since Spain's new SMS Sender ID rules make
 * plain SMS impractical and WhatsApp isn't wired up yet).
 *
 * Without SMTP_URL configured, this logs the magic link to the server
 * console instead of emailing it — the login flow stays fully testable
 * in local dev / this sandbox without real mail infrastructure.
 */
export const emailProvider: AuthProvider = {
  channel: "email",

  async deliverCode({ identifier, verifyUrl }: DeliverCodeInput): Promise<void> {
    const smtpUrl = process.env.SMTP_URL;
    const from = process.env.EMAIL_FROM ?? "noreply@dianpin-jobs.es";

    if (!smtpUrl) {
      console.log(`[auth/email] no SMTP_URL set — magic link for ${identifier}:`);
      console.log(verifyUrl);
      return;
    }

    const transporter = nodemailer.createTransport(smtpUrl);
    await transporter.sendMail({
      from,
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
