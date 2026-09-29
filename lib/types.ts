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
  phone: string;
  wechat: string | null;
  name: string;
  locale: Locale;
  created_at: string;
}

export interface SeekerProfile {
  user_id: string;
  job_types: string[];
  experience_years: number;
  available_from: string;
  residence_status: ResidenceStatus;
  expected_salary_min: number;
  expected_salary_max: number;
  preferred_cities: string[];
  live_in_ok: boolean;
  languages: string[];
  bio: string;
  avatar: string;
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

/** Monthly-normalized salary, used for the salary-floor filter (hour×8×22, day×22). */
export function normalizeSalaryToMonth(
  amount: number,
  period: SalaryPeriod
): number {
  if (period === "hour") return amount * 8 * 22;
  if (period === "day") return amount * 22;
  return amount;
}
