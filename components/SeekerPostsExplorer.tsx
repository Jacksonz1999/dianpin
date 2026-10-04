"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { searchSeekerPosts } from "@/app/actions";
import type { City, JobType, SeekerPostSummary } from "@/lib/types";
import { renderJobTypeIcon } from "@/lib/job-type-icons";
import { useLocale } from "./LocaleProvider";

const ALL = "";

function SeekerPostCard({
  post,
  jobType,
  city,
}: {
  post: SeekerPostSummary;
  jobType: JobType | undefined;
  city: City | undefined;
}) {
  const { locale, t } = useLocale();
  const jobTypeName = jobType
    ? locale === "es"
      ? jobType.name_es
      : jobType.name_zh
    : post.job_type;
  const cityName = city ? (locale === "es" ? city.name_es : city.name_zh) : post.city;
  const periodLabel = post.salary_period ? t(`job.salaryPeriod.${post.salary_period}`) : null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{post.title}</h3>
        {post.expected_salary_min != null && periodLabel && (
          <span className="shrink-0 text-sm font-semibold text-[var(--color-primary)]">
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
        {post.experience_years != null && (
          <span className="rounded-full bg-[var(--color-bg)] px-2 py-1">
            {t("me.profile.experienceYears", { count: post.experience_years })}
          </span>
        )}
        {post.residence_status && (
          <span className="rounded-full bg-[var(--color-bg)] px-2 py-1">
            {t(`residenceStatus.${post.residence_status}`)}
          </span>
        )}
        {post.live_in_ok && (
          <span className="rounded-full bg-[var(--color-bg)] px-2 py-1">
            {t("job.liveIn")}
          </span>
        )}
      </div>

      {post.bio && (
        <p className="line-clamp-2 text-sm text-[var(--color-text-muted)]">{post.bio}</p>
      )}

      <div className="mt-auto flex items-center justify-end pt-1">
        <Link
          href={`/employer/seekers/${post.id}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--color-primary)] px-4 text-xs font-medium text-[var(--color-primary-text)]"
        >
          {t("employer.seekers.viewDetail")}
        </Link>
      </div>
    </div>
  );
}

export function SeekerPostsExplorer({
  initialPosts,
  cities,
  jobTypes,
}: {
  initialPosts: SeekerPostSummary[];
  cities: City[];
  jobTypes: JobType[];
}) {
  const { locale, t } = useLocale();

  const [city, setCity] = useState<string>(ALL);
  const [jobType, setJobType] = useState<string>(ALL);
  const [posts, setPosts] = useState<SeekerPostSummary[]>(initialPosts);

  useEffect(() => {
    let cancelled = false;
    searchSeekerPosts({
      status: "active",
      city: city || undefined,
      jobType: jobType || undefined,
    }).then((result) => {
      if (!cancelled) setPosts(result);
    });
    return () => {
      cancelled = true;
    };
  }, [city, jobType]);

  const jobTypesById = useMemo(
    () => new Map(jobTypes.map((jt) => [jt.id, jt])),
    [jobTypes]
  );
  const citiesById = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">{t("employer.seekers.title")}</h1>

      <div className="flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setCity(ALL)}
          className={
            "min-h-[36px] shrink-0 rounded-full px-3 text-sm " +
            (city === ALL
              ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
              : "bg-[var(--color-bg)] text-[var(--color-text-muted)]")
          }
        >
          {t("common.all")}
        </button>
        {cities.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCity(c.id)}
            className={
              "min-h-[36px] shrink-0 rounded-full px-3 text-sm " +
              (city === c.id
                ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                : "bg-[var(--color-bg)] text-[var(--color-text-muted)]")
            }
          >
            {locale === "es" ? c.name_es : c.name_zh}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        {t("home.filters.jobType")}
        <select
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-3"
        >
          <option value={ALL}>{t("common.all")}</option>
          {jobTypes.map((jt) => (
            <option key={jt.id} value={jt.id}>
              {locale === "es" ? jt.name_es : jt.name_zh}
            </option>
          ))}
        </select>
      </label>

      <p className="text-sm text-[var(--color-text-muted)]">
        {t("employer.seekers.resultsCount", { count: posts.length })}
      </p>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("employer.seekers.empty")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <SeekerPostCard
              key={post.id}
              post={post}
              jobType={jobTypesById.get(post.job_type)}
              city={citiesById.get(post.city)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
