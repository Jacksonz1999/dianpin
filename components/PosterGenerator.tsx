"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { City, Job, JobType, PublicStore } from "@/lib/types";
import type { JobPosterMeta } from "@/lib/db";

function useSiteBase(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function PosterCard({
  job,
  store,
  city,
  posterMeta,
  qrValue,
  qrLocale,
  setQrLocale,
  compact = false,
}: {
  job: Job;
  store: PublicStore;
  city: City;
  posterMeta: JobPosterMeta;
  qrValue: string;
  qrLocale: "es" | "en";
  setQrLocale: (loc: "es" | "en") => void;
  compact?: boolean;
}) {
  const storeNameZh = store.name_zh;
  const jobTitleZh = job.title_zh;
  const period = job.salary_period;
  const salaryText =
    job.salary_min === job.salary_max
      ? `€${job.salary_min}/${period === "hour" ? "小时" : "月"}`
      : `€${job.salary_min}-${job.salary_max}/${period === "hour" ? "小时" : "月"}`;
  const mealsZh = job.meals_included
    ? job.live_in
      ? "包吃住"
      : "包吃"
    : "不包吃住";
  const resZh =
    job.residence_required === "required"
      ? "需合法居留"
      : job.residence_required === "prefer"
        ? "优先有居留"
        : "不限居留";
  const cityNameZh = city.name_zh;

  const infoRows: [string, string][] = [
    ["薪资", salaryText],
    ["吃住", mealsZh],
    ["居留", resZh],
    ["地点", `${cityNameZh}${job.district ? " " + job.district : ""}`],
  ];
  if (posterMeta.contactPhone)
    infoRows.push(["电话", posterMeta.contactPhone]);
  if (posterMeta.contactWhatsapp)
    infoRows.push(["WhatsApp", posterMeta.contactWhatsapp]);

  return (
    <div
      id={compact ? undefined : "poster-print"}
      className={
        "flex flex-col gap-4 rounded-2xl border-2 border-[var(--color-primary)] bg-white p-6 text-[var(--color-text)] " +
        (compact ? "aspect-[9/16] w-full max-w-[320px]" : "w-full max-w-[794px]")
      }
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-[var(--color-primary)]">
          PegaLocal · 招聘告示
        </p>
        <h1
          className={"font-bold leading-tight " + (compact ? "text-2xl" : "text-4xl")}
        >
          {storeNameZh}
        </h1>
        <p className={"font-semibold " + (compact ? "text-lg" : "text-2xl")}>
          {jobTitleZh}
          {job.title_es ? (
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              {job.title_es}
            </span>
          ) : null}
        </p>
      </div>

      <div
        className={
          "grid gap-2 " +
          (compact ? "grid-cols-1 text-sm" : "grid-cols-2 text-base")
        }
      >
        {infoRows.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-1"
          >
            <span className="text-[var(--color-text-muted)]">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-text-muted)]">
            扫码查看职位详情（西语 / 英语）
          </span>
          <div className="flex gap-1">
            {(["es", "en"] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setQrLocale(loc)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium " +
                  (qrLocale === loc
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
                    : "border border-[var(--color-border)] text-[var(--color-text-muted)]")
                }
              >
                {loc === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white p-2 shadow">
          <QRCodeSVG value={qrValue} size={compact ? 110 : 140} level="M" />
        </div>
      </div>
    </div>
  );
}

export function PosterGenerator({
  job,
  store,
  city,
  posterMeta,
}: {
  job: Job;
  store: PublicStore;
  city: City;
  posterMeta: JobPosterMeta;
}) {
  const [qrLocale, setQrLocale] = useState<"es" | "en">("es");
  const base = useSiteBase();
  const slug = posterMeta.posterSlug ?? job.id;
  const qrValue = `${base}/${qrLocale}/j/${slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[44px] rounded-full bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-primary-text)]"
        >
          打印 / 保存为 PDF（A4）
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">
          二维码当前指向：{qrLocale === "es" ? "西班牙语" : "英语"} 落地页
        </span>
      </div>

      <PosterCard
        job={job}
        store={store}
        city={city}
        posterMeta={posterMeta}
        qrValue={qrValue}
        qrLocale={qrLocale}
        setQrLocale={setQrLocale}
      />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">手机分享图（长按保存）</h2>
        <PosterCard
          compact
          job={job}
          store={store}
          city={city}
          posterMeta={posterMeta}
          qrValue={qrValue}
          qrLocale={qrLocale}
          setQrLocale={setQrLocale}
        />
      </div>
    </div>
  );
}
