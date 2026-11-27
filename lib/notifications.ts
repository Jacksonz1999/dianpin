import {
  getApplicationById,
  getJobById,
  getStoreById,
  getUserById,
} from "./db";
import { t } from "./i18n";
import { localePath } from "./locale-routing";
import { sendMail } from "./mail";
import { getSiteUrl } from "./site-url";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char
  );
}

async function notify(
  label: string,
  input: Parameters<typeof sendMail>[0] | null
): Promise<void> {
  if (!input) return;
  try {
    await sendMail(input);
  } catch (error) {
    console.error(
      `[notifications] ${label} failed:`,
      error instanceof Error ? error.message : "unknown"
    );
  }
}

export async function notifyEmployerNewApplication(
  applicationId: string
): Promise<void> {
  const application = await getApplicationById(applicationId);
  if (!application) return;
  const job = await getJobById(application.job_id);
  const store = job ? await getStoreById(job.store_id) : null;
  const owner = store ? await getUserById(store.owner_user_id) : null;
  const seeker = await getUserById(application.seeker_user_id);
  if (!job || !store || !owner?.email || !seeker) return;

  const locale = owner.locale;
  const jobTitle = locale === "zh" ? job.title_zh : job.title_es;
  const link = `${getSiteUrl()}${localePath(`/employer/job/${job.id}`, locale)}`;
  const body = t(locale, "notification.employerNewApplication.body", {
    seeker: seeker.name,
    job: jobTitle,
    link,
  });
  await notify("new application", {
    to: owner.email,
    subject: t(locale, "notification.employerNewApplication.subject", {
      job: jobTitle,
    }),
    text: body,
    html: `<p>${escapeHtml(body)}</p>`,
  });
}

export async function notifySeekerApplicationStatus(
  applicationId: string
): Promise<void> {
  const application = await getApplicationById(applicationId);
  if (
    !application ||
    !["contacted", "hired", "rejected"].includes(application.status)
  ) {
    return;
  }
  const [seeker, job] = await Promise.all([
    getUserById(application.seeker_user_id),
    getJobById(application.job_id),
  ]);
  if (!seeker?.email || !job) return;

  const locale = seeker.locale;
  const jobTitle = locale === "zh" ? job.title_zh : job.title_es;
  const status = t(locale, `applicationStatus.${application.status}`);
  const link = `${getSiteUrl()}${localePath("/me/applications", locale)}`;
  const body = t(locale, "notification.seekerStatus.body", {
    job: jobTitle,
    status,
    link,
  });
  await notify("application status", {
    to: seeker.email,
    subject: t(locale, "notification.seekerStatus.subject", { job: jobTitle }),
    text: body,
    html: `<p>${escapeHtml(body)}</p>`,
  });
}
