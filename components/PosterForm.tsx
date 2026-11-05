"use client";

import { useActionState } from "react";
import type { City, JobType } from "@/lib/types";
import { createPosterPost, type PosterResult } from "@/app/employer/poster/actions";

const initial: PosterResult = { ok: false };

export function PosterForm({
  jobTypes,
  cities,
}: {
  jobTypes: JobType[];
  cities: City[];
}) {
  const [state, formAction, pending] = useActionState(createPosterPost, initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nameZh" className="text-sm font-medium">
          店名 <span className="text-red-500">*</span>
        </label>
        <input
          id="nameZh"
          name="nameZh"
          required
          className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
          placeholder="例如：好运百元店"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="jobTypeId" className="text-sm font-medium">
          工种 <span className="text-red-500">*</span>
        </label>
        <select
          id="jobTypeId"
          name="jobTypeId"
          required
          defaultValue=""
          className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        >
          <option value="" disabled>
            选择工种
          </option>
          {jobTypes.map((jt) => (
            <option key={jt.id} value={jt.id}>
              {jt.name_zh}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="text-sm font-medium">
            城市 <span className="text-red-500">*</span>
          </label>
          <select
            id="city"
            name="city"
            required
            defaultValue=""
            className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
          >
            <option value="" disabled>
              选择城市
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_zh}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="district" className="text-sm font-medium">
            区 / 区域
          </label>
          <input
            id="district"
            name="district"
            className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            placeholder="例如：Usera"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">薪资</span>
        <div className="flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="radio"
              name="salaryPeriod"
              value="month"
              defaultChecked
            />
            月薪 (€/月)
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="radio" name="salaryPeriod" value="hour" />
            时薪 (€/时)
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="salaryMin"
            type="number"
            min={0}
            inputMode="numeric"
            className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            placeholder="最低"
          />
          <input
            name="salaryMax"
            type="number"
            min={0}
            inputMode="numeric"
            className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            placeholder="最高"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">吃住</span>
        <div className="flex items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" name="mealsIncluded" value="on" />
            包吃
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" name="liveIn" value="on" />
            包住
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="residenceRequired" className="text-sm font-medium">
          居留要求
        </label>
        <select
          id="residenceRequired"
          name="residenceRequired"
          defaultValue="none"
          className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
        >
          <option value="none">不限居留</option>
          <option value="prefer">优先有居留</option>
          <option value="required">需合法居留</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contactPhone" className="text-sm font-medium">
            联系电话 <span className="text-red-500">*</span>
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            required
            className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            placeholder="+34 600 000 000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contactWhatsapp" className="text-sm font-medium">
            WhatsApp
          </label>
          <input
            id="contactWhatsapp"
            name="contactWhatsapp"
            type="tel"
            className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            placeholder="+34 600 000 000"
          />
        </div>
      </div>

      {state && !state.ok && state.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-[48px] rounded-full bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-text)] disabled:opacity-60"
      >
        {pending ? "生成中…" : "生成招聘告示"}
      </button>
    </form>
  );
}
