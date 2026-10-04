"use client";

import Link from "next/link";
import type { City, JobType, SeekerPost } from "@/lib/types";
import { renderJobTypeIcon } from "@/lib/job-type-icons";
import { useLocale } from "./LocaleProvider";

export function SeekerPostDetailView({
  post,
  city,
  jobType,
  isLoggedInEmployer,
}: {
  post: SeekerPost;
  city: City;
  jobType: JobType;
  isLoggedInEmployer: boolean;
}) {
  const { locale, t } = useLocale();

  const cityName = locale === "es" ? city.name_es : city.name_zh;
  const jobTypeName = locale === "es" ? jobType.name_es : jobType.name_zh;
  const periodLabel = post.salary_period ? t(`job.salaryPeriod.${post.salary_period}`) : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-semibold">{post.title}</h1>
        {post.expected_salary_min != null && periodLabel && (
          <span className="shrink-0 text-base font-semibold text-[var(--color-primary)]">
            {post.expected_salary_min}
            {post.expected_salary_max && post.expected_salary_max !== post.expected_salary_min
              ? `-${post.expected_salary_max}`
              : ""}{" "}
            €/{periodLabel}
          </span>
        )}
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        {cityName} {post.district}
      </p>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg)] px-2 py-1">
          {renderJobTypeIcon(post.job_type, "h-3.5 w-3.5 shrink-0")}
          {jobTypeName}
        </span>
        {post.live_in_ok && (
          <span className="rounded-full bg-[var(--color-bg)] px-2 py-1">
            {t("job.liveIn")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-bg)] p-3 text-sm">
        <div>
          <span className="text-[var(--color-text-muted)]">
            {t("me.profile.experienceLabel")}
          </span>
          <p className="font-medium">
            {post.experience_years != null
              ? t("me.profile.experienceYears", { count: post.experience_years })
              : t("me.profile.notSet")}
          </p>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">
            {t("me.profile.availableFromLabel")}
          </span>
          <p className="font-medium">
            {post.available_from ? post.available_from.slice(0, 10) : t("me.profile.notSet")}
          </p>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">
            {t("me.profile.residenceLabel")}
          </span>
          <p className="font-medium">
            {post.residence_status
              ? t(`residenceStatus.${post.residence_status}`)
              : t("me.profile.notSet")}
          </p>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">
            {t("seekerPost.form.languagesLabel")}
          </span>
          <p className="font-medium">
            {post.languages.length > 0 ? post.languages.join(", ") : t("me.profile.notSet")}
          </p>
        </div>
      </div>

      {post.bio && <p className="text-sm">{post.bio}</p>}

      <div className="rounded-lg bg-[var(--color-bg)] px-3 py-2 text-sm">
        <span className="text-[var(--color-text-muted)]">
          {t("seekerPost.detail.contactTitle")}：
        </span>
        {isLoggedInEmployer ? (
          <span className="font-medium">
            {[post.contact_phone, post.contact_wechat].filter(Boolean).join(" · ") || "—"}
          </span>
        ) : (
          <div className="mt-2 flex flex-col items-start gap-2">
            <span className="text-[var(--color-text-muted)]">
              {t("seekerPost.detail.contactHidden")}
            </span>
            <Link
              href={`/login?role=employer&next=${encodeURIComponent(`/employer/seekers/${post.id}`)}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)]"
            >
              {t("seekerPost.detail.loginToView")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
