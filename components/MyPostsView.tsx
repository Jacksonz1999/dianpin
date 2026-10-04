"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateSeekerPostStatusAction } from "@/app/actions";
import { nextSeekerPostStatuses } from "@/lib/status-machine";
import type { City, JobType, SeekerPost, SeekerPostStatus } from "@/lib/types";
import { useLocale } from "./LocaleProvider";

function PostRow({
  post,
  jobTypesById,
  citiesById,
}: {
  post: SeekerPost;
  jobTypesById: Map<string, JobType>;
  citiesById: Map<string, City>;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [changing, setChanging] = useState<SeekerPostStatus | null>(null);

  const jobType = jobTypesById.get(post.job_type);
  const city = citiesById.get(post.city);

  async function handleStatusChange(next: SeekerPostStatus) {
    setChanging(next);
    await updateSeekerPostStatusAction(post.id, next);
    setChanging(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{post.title}</span>
        <span className="shrink-0 rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">
          {t(`seekerPostStatus.${post.status}`)}
        </span>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        {jobType ? (locale === "es" ? jobType.name_es : jobType.name_zh) : post.job_type}
        {" · "}
        {city ? (locale === "es" ? city.name_es : city.name_zh) : post.city}
      </p>

      {post.status === "closed" && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {t("me.posts.closedHint")}
        </p>
      )}

      {nextSeekerPostStatuses(post.status).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {nextSeekerPostStatuses(post.status).map((next) => (
            <button
              key={next}
              type="button"
              disabled={changing !== null}
              onClick={() => handleStatusChange(next)}
              className="min-h-[32px] rounded-full border border-[var(--color-border)] px-2.5 text-xs text-[var(--color-text-muted)] disabled:opacity-60"
            >
              {changing === next
                ? t("job.form.publishing")
                : t(next === "active" ? "me.posts.publish" : "me.posts.close")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MyPostsView({
  posts,
  jobTypes,
  cities,
}: {
  posts: SeekerPost[];
  jobTypes: JobType[];
  cities: City[];
}) {
  const { t } = useLocale();
  const jobTypesById = new Map(jobTypes.map((jt) => [jt.id, jt]));
  const citiesById = new Map(cities.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("me.posts.title")}</h1>
        <Link
          href="/me/posts/new"
          className="min-h-[36px] rounded-full bg-[var(--color-primary)] px-3 py-2 text-sm text-[var(--color-primary-text)]"
        >
          {t("me.posts.newCta")}
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t("me.posts.empty")}
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <PostRow
            key={post.id}
            post={post}
            jobTypesById={jobTypesById}
            citiesById={citiesById}
          />
        ))
      )}
    </div>
  );
}
