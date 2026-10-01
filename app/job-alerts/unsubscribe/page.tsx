import Link from "next/link";
import { defaultLocale, t } from "@/lib/i18n";
import {
  getJobAlertByUnsubscribeToken,
  unsubscribeJobAlertByToken,
} from "@/lib/job-alerts";

export const dynamic = "force-dynamic";

/** One-click unsubscribe link carried in every job-alert notification email (WP-B1). */
export default async function JobAlertUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const existing = token ? await getJobAlertByUnsubscribeToken(token) : null;
  const locale = existing?.locale ?? defaultLocale;
  const unsubscribed = token ? await unsubscribeJobAlertByToken(token) : false;

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="max-w-sm text-sm">
        {unsubscribed
          ? t(locale, "jobAlert.unsubscribe.success")
          : t(locale, "jobAlert.unsubscribe.invalid")}
      </p>
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)]"
      >
        {t(locale, "jobAlert.backHome")}
      </Link>
    </div>
  );
}
