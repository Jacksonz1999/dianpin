import type { Locale } from "./i18n";

export type UserRole = "seeker" | "employer";

export type ResidenceStatus = "有居留" | "办理中" | "学生居留" | "家庭居留" | "无居留";

export type JobStatus = "draft" | "active" | "paused" | "filled" | "closed";

export type ApplicationStatus =
  | "submitted"
  | "viewed"
  | "contacted"
  | "hired"
  | "rejected"
  | "withdrawn";

export type StoreVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type ResidenceRequired = "none" | "prefer" | "required";

export type SalaryPeriod = "hour" | "day" | "month";

export type ReportTargetType = "job" | "store";

export type SeekerPostStatus = "draft" | "active" | "closed";

/** Auth provider channels (WP4) — "email" ships in v1, "whatsapp" is a reserved slot. */
export type AuthChannel = "email" | "whatsapp";

export interface City {
  id: string;
  name_zh: string;
  name_es: string;
  region: string;
}

export interface JobType {
  id: string;
  name_zh: string;
  name_es: string;
  icon: string;
}

export interface User {
  id: string;
  role: UserRole;
  phone: string | null;
  wechat: string | null;
  name: string;
  locale: Locale;
  /** Login identifier for the email-magic-link auth provider (WP4). */
  email: string | null;
  created_at: string;
}

export interface SeekerProfile {
  user_id: string;
  job_types: string[];
  experience_years: number | null;
  available_from: string | null;
  residence_status: ResidenceStatus | null;
  expected_salary_min: number | null;
  expected_salary_max: number | null;
  preferred_cities: string[];
  live_in_ok: boolean;
  languages: string[];
  bio: string | null;
  avatar: string | null;
}

/**
 * The "最小档案" fields collected by the apply-flow onboarding form and by
 * the /me profile editor (AGENTS.md's 姓名/工种/经验/可到岗/居留状态/期望
 * 月薪/联系方式). name/phone live on `users`; the rest on
 * `seeker_profiles` — see lib/db.ts's saveSeekerProfile.
 */
export interface SeekerProfileFormValues {
  name: string;
  phone: string;
  jobTypes: string[];
  experienceYears: number | null;
  availableFrom: string | null;
  residenceStatus: ResidenceStatus | null;
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
}

export interface Store {
  id: string;
  owner_user_id: string;
  name_zh: string;
  name_es: string;
  city: string;
  district: string;
  address: string;
  category: string;
  cover_image: string;
  photos: string[];
  verification_status: StoreVerificationStatus;
  verified_at: string | null;
  rating_avg: number;
  rating_count: number;
  is_seed: boolean;
}

export interface Job {
  id: string;
  store_id: string;
  title_zh: string;
  title_es: string;
  job_type: string;
  city: string;
  district: string;
  salary_min: number;
  salary_max: number;
  salary_period: SalaryPeriod;
  headcount: number;
  schedule: string;
  live_in: boolean;
  meals_included: boolean;
  language_required: string;
  residence_required: ResidenceRequired;
  description_zh: string;
  description_es: string;
  status: JobStatus;
  published_at: string;
  expires_at: string | null;
  views: number;
  is_seed: boolean;
}

export interface Application {
  id: string;
  job_id: string;
  seeker_user_id: string;
  status: ApplicationStatus;
  message: string;
  contact_revealed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  store_id: string;
  seeker_user_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Report {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reporter_user_id: string;
  reason: string;
  status: string;
}

/** Fields collected by the employer's "创建门店" form; owner_user_id is supplied separately by the caller. */
export interface StoreFormValues {
  nameZh: string;
  nameEs: string;
  city: string;
  district: string;
  address: string;
  category: string;
  coverImage: string;
}

/**
 * Fields collected by the employer's templated "发布岗位" form — all the
 * structured columns jobs.* requires, no free-text-only posting allowed.
 * store_id/status are supplied separately by the caller.
 */
export interface JobFormValues {
  titleZh: string;
  titleEs: string;
  jobType: string;
  district: string;
  salaryMin: number;
  salaryMax: number;
  salaryPeriod: SalaryPeriod;
  headcount: number;
  schedule: string;
  liveIn: boolean;
  mealsIncluded: boolean;
  languageRequired: string;
  residenceRequired: ResidenceRequired;
  descriptionZh: string;
  descriptionEs: string;
}

/** Monthly-normalized salary, used for the salary-floor filter (hour×8×22, day×22). */
export function normalizeSalaryToMonth(
  amount: number,
  period: SalaryPeriod
): number {
  if (period === "hour") return amount * 8 * 22;
  if (period === "day") return amount * 22;
  return amount;
}

/**
 * "有新岗位通知我" subscription (round 7 / WP-B1) — see AGENTS.md §5.
 * `city`/`jobType` null = unrestricted on that dimension. UNIQUE(email)
 * at the DB level means one active filter set per address.
 */
export interface JobAlert {
  id: string;
  email: string;
  seeker_user_id: string | null;
  city: string | null;
  job_type: string | null;
  salary_min: number | null;
  meals_included: boolean;
  residence_ok: boolean;
  locale: Locale;
  confirm_token: string;
  confirmed_at: string | null;
  unsubscribe_token: string;
  created_at: string;
}

/** Fields collected by the "有新岗位通知我" subscribe form. */
export interface JobAlertFormValues {
  email: string;
  city: string | null;
  jobType: string | null;
  salaryMin: number | null;
  mealsIncluded: boolean;
  residenceOk: boolean;
}

/**
 * The reverse of Job (round 8 / WP-E) — a seeker's own "我要找 XX 工作"
 * post, browsable by employers. See AGENTS.md §5 for why this is its own
 * table rather than a polymorphic row shared with jobs. contact_phone/
 * contact_wechat are only ever sent to the client on the detail page and
 * only for an employer-role session — see lib/db.ts's getSeekerPostById
 * and AGENTS.md §6's contact-reveal rule for seeker_posts.
 */
export interface SeekerPost {
  id: string;
  user_id: string;
  title: string;
  job_type: string;
  city: string;
  district: string;
  experience_years: number | null;
  available_from: string | null;
  residence_status: ResidenceStatus | null;
  expected_salary_min: number | null;
  expected_salary_max: number | null;
  salary_period: SalaryPeriod | null;
  languages: string[];
  live_in_ok: boolean;
  bio: string;
  contact_phone: string;
  contact_wechat: string;
  status: SeekerPostStatus;
  views: number;
  published_at: string | null;
  expires_at: string | null;
  is_seed: boolean;
  created_at: string;
  updated_at: string;
}

/** List/card-safe projection of SeekerPost — never carries contact_phone/contact_wechat (AGENTS.md §6: never render contact info on the list page). */
export type SeekerPostSummary = Omit<
  SeekerPost,
  "contact_phone" | "contact_wechat"
>;

/** Fields collected by the templated "发布求职信息" form. user_id/status are supplied separately by the caller. */
export interface SeekerPostFormValues {
  title: string;
  jobType: string;
  city: string;
  district: string;
  experienceYears: number | null;
  availableFrom: string | null;
  residenceStatus: ResidenceStatus | null;
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  languages: string[];
  liveInOk: boolean;
  bio: string;
  contactPhone: string;
  contactWechat: string;
}
