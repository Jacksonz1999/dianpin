import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import { cities, jobAlerts, jobTypes } from "@/db/schema";
import { sendMail } from "./mail";
import { absUrl } from "./site-url";
import type { Locale } from "./i18n";
import type { Job, JobAlert, JobAlertFormValues } from "./types";
import { normalizeSalaryToMonth } from "./types";

/**
 * "有新岗位通知我" (WP-B1, see AGENTS.md §5). Deliberately does NOT import
 * from lib/db.ts: lib/db.ts's createJob calls notifyJobAlertSubscribers
 * below, so importing lib/db.ts here would create a circular module
 * dependency. Reference-table lookups (cities/job_types) are small enough
 * to duplicate directly against the drizzle client instead.
 */

export interface SubscribeJobAlertInput extends JobAlertFormValues {
  seekerUserId: string | null;
  locale: Locale;
}

/**
 * Creates a subscription, or — thanks to UNIQUE(email) — updates the
 * filters on an existing one. `needsConfirmation` tells the caller
 * whether to (re)send the double-opt-in confirmation email: true unless
 * this address already confirmed a previous subscription, in which case
 * changing filters doesn't require re-confirming (the GDPR consent is
 * for receiving mail at all, already given).
 */
export async function subscribeJobAlert(
  input: SubscribeJobAlertInput
): Promise<{ alert: JobAlert; needsConfirmation: boolean }> {
  const email = input.email.trim().toLowerCase();

  const values = {
    seeker_user_id: input.seekerUserId,
    city: input.city,
    job_type: input.jobType,
    salary_min: input.salaryMin,
    meals_included: input.mealsIncluded,
    residence_ok: input.residenceOk,
    locale: input.locale,
  };

  const [row] = await db
    .insert(jobAlerts)
    .values({
      id: `alert_${randomUUID()}`,
      email,
      ...values,
      confirm_token: randomUUID(),
      unsubscribe_token: randomUUID(),
    })
    .onConflictDoUpdate({
      target: jobAlerts.email,
      // confirm_token/unsubscribe_token/confirmed_at are intentionally
      // left out of the update set — an existing subscriber who tweaks
      // their filters keeps the same tokens and confirmation state.
      set: values,
    })
    .returning();

  return { alert: row as JobAlert, needsConfirmation: !row.confirmed_at };
}

export async function sendJobAlertConfirmationEmail(alert: JobAlert): Promise<void> {
  const confirmUrl = absUrl(`/job-alerts/confirm?token=${alert.confirm_token}`);
  await sendMail({
    to: alert.email,
    subject: "确认岗位通知订阅 / Confirma tu alerta de empleo — 店聘 DianPin",
    text: [
      "点击链接确认订阅「有新岗位通知我」（不点击确认，你不会收到任何通知邮件）：",
      confirmUrl,
      "",
      "Haz clic para confirmar tu alerta de nuevos empleos (si no confirmas, no recibirás ningún aviso):",
      confirmUrl,
    ].join("\n"),
    html: [
      "<p>点击链接确认订阅「有新岗位通知我」（不点击确认，你不会收到任何通知邮件）：</p>",
      `<p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
      "<hr/>",
      "<p>Haz clic para confirmar tu alerta de nuevos empleos (si no confirmas, no recibirás ningún aviso):</p>",
      `<p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
    ].join(""),
  });
}

export async function confirmJobAlert(token: string): Promise<JobAlert | null> {
  const [row] = await db
    .update(jobAlerts)
    .set({ confirmed_at: new Date().toISOString() })
    .where(eq(jobAlerts.confirm_token, token))
    .returning();
  return (row as JobAlert) ?? null;
}

export async function getJobAlertByUnsubscribeToken(token: string): Promise<JobAlert | null> {
  const [row] = await db
    .select()
    .from(jobAlerts)
    .where(eq(jobAlerts.unsubscribe_token, token));
  return (row as JobAlert) ?? null;
}

/** Idempotent — unsubscribing twice (e.g. a retried click) is a no-op, not an error. */
export async function unsubscribeJobAlertByToken(token: string): Promise<boolean> {
  const result = await db
    .delete(jobAlerts)
    .where(eq(jobAlerts.unsubscribe_token, token))
    .returning({ id: jobAlerts.id });
  return result.length > 0;
}

/**
 * Called synchronously from lib/db.ts's createJob when a job is published
 * with status=active (see AGENTS.md §5 — deliberately not wired into
 * db/import-csv.ts's bulk insert, so a large CSV import never floods
 * subscribers). Real inventory is small enough that match counts are
 * expected to be tiny; see the WP-B PR description for why this would
 * need to move to a queue before a bulk-publish flow is ever added.
 */
export async function notifyJobAlertSubscribers(job: Job): Promise<void> {
  const monthlyMax = normalizeSalaryToMonth(job.salary_max, job.salary_period);

  const conditions = [
    isNotNull(jobAlerts.confirmed_at),
    or(isNull(jobAlerts.city), eq(jobAlerts.city, job.city)),
    or(isNull(jobAlerts.job_type), eq(jobAlerts.job_type, job.job_type)),
    or(isNull(jobAlerts.salary_min), lte(jobAlerts.salary_min, monthlyMax)),
  ];
  if (!job.meals_included) {
    conditions.push(eq(jobAlerts.meals_included, false));
  }
  if (job.residence_required === "required") {
    conditions.push(eq(jobAlerts.residence_ok, false));
  }

  const rows = (await db
    .select()
    .from(jobAlerts)
    .where(and(...conditions))) as JobAlert[];

  if (rows.length === 0) return;

  const [city, jobType] = await Promise.all([
    db
      .select()
      .from(cities)
      .where(eq(cities.id, job.city))
      .then((r) => r[0]),
    db
      .select()
      .from(jobTypes)
      .where(eq(jobTypes.id, job.job_type))
      .then((r) => r[0]),
  ]);

  // allSettled, not all: one subscriber's bad/rejecting mailbox (or an
  // SMTP outage affecting every send) must never fail the others, and
  // the caller (createJob) treats this whole function as best-effort —
  // see its own try/catch.
  const results = await Promise.allSettled(
    rows.map((alert) => sendJobAlertNotification(alert, job, city, jobType))
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[job-alerts] notification send failed:", result.reason);
    }
  }
}

async function sendJobAlertNotification(
  alert: JobAlert,
  job: Job,
  city: { name_zh: string; name_es: string } | undefined,
  jobType: { name_zh: string; name_es: string } | undefined
): Promise<void> {
  const jobUrl = absUrl(`/job/${job.id}`);
  const unsubscribeUrl = absUrl(`/job-alerts/unsubscribe?token=${alert.unsubscribe_token}`);
  const cityName = city ? `${city.name_zh}/${city.name_es}` : "";
  const jobTypeName = jobType ? `${jobType.name_zh}/${jobType.name_es}` : "";

  await sendMail({
    to: alert.email,
    subject: "有新岗位符合你的订阅条件 / Nuevo empleo que coincide con tu alerta — 店聘 DianPin",
    text: [
      `${job.title_zh} / ${job.title_es}`,
      [cityName, jobTypeName].filter(Boolean).join(" · "),
      jobUrl,
      "",
      `退订 / Darse de baja: ${unsubscribeUrl}`,
    ].join("\n"),
    html: [
      `<p><strong>${job.title_zh} / ${job.title_es}</strong></p>`,
      `<p>${[cityName, jobTypeName].filter(Boolean).join(" · ")}</p>`,
      `<p><a href="${jobUrl}">${jobUrl}</a></p>`,
      "<hr/>",
      `<p style="font-size:12px;color:#888;">退订这个通知 / Darse de baja: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>`,
    ].join(""),
  });
}
