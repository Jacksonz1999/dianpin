"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReviewAction } from "@/app/actions";
import type { ReviewAccess } from "@/lib/types";
import { useLocale } from "./LocaleProvider";
import { LocaleLink } from "./LocaleLink";
import { Modal } from "./Modal";

export function ReviewForm({
  storeId,
  access,
}: {
  storeId: string;
  access: ReviewAccess;
}) {
  const { t, href } = useLocale();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (access === "not_seeker") return null;

  if (access === "anonymous") {
    const nextPath = href(`/store/${storeId}`);
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="text-[var(--color-text-muted)]">{t("review.loginRequired")}</p>
        <LocaleLink
          href={`/login?role=seeker&next=${encodeURIComponent(nextPath)}`}
          className="mt-2 inline-flex min-h-[44px] items-center font-medium text-[var(--color-primary)] underline underline-offset-2"
        >
          {t("review.loginCta")}
        </LocaleLink>
      </div>
    );
  }

  if (access === "not_applied") {
    return (
      <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
        {t("review.notApplied")}
      </p>
    );
  }

  if (access === "already_reviewed" && !submitted) {
    return (
      <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
        {t("review.alreadyReviewed")}
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await submitReviewAction({ storeId, rating, comment });
    setSubmitting(false);
    if (result.ok) {
      setSubmitted(true);
      setComment("");
      setOpen(false);
      router.refresh();
    } else {
      setError(t(`review.error.${result.error}`));
    }
  }

  if (submitted) {
    return (
      <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-primary)]">
        {t("review.success")}
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] self-start rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium"
      >
        {t("review.writeCta")}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("review.formTitle")}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm">{t("review.ratingLabel")}</span>
            <div className="flex gap-1" aria-label={t("review.ratingLabel")}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={t("review.ratingOption", { count: value })}
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-2xl text-amber-500"
                >
                  {value <= rating ? "★" : "☆"}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            {t("review.commentLabel")}
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={t("review.commentPlaceholder")}
              minLength={5}
              maxLength={500}
              required
              rows={3}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
          >
            {submitting ? t("review.submitting") : t("review.submit")}
          </button>
        </form>
      </Modal>
    </>
  );
}
