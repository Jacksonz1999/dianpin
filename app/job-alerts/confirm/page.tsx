import Link from "next/link";
import { defaultLocale, t } from "@/lib/i18n";
import { confirmJobAlert } from "@/lib/job-alerts";

export const dynamic = "force-dynamic";

/**
 * Double opt-in confirm link (WP-B1) — the GET link from the confirmation
 * email. Uses the subscriber's own stored locale (not a cookie/session,
 * since this can be opened with no session at all) so the result message
 * matches whichever language they signed up in.
 */
export default async function JobAlertConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const alert = token ? await confirmJobAlert(token) : null;
  const locale = alert?.locale ?? defaultLocale;

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="max-w-sm text-sm">
        {alert
          ? t(locale, "jobAlert.confirm.success")
          : t(locale, "jobAlert.confirm.invalid")}
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
