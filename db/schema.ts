import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema for the 9 tables in AGENTS.md §5. Field names, types and
 * enum values mirror that document exactly — it is the source of truth,
 * not this file. Foreign keys and indexes beyond what §5 lists in prose
 * (e.g. jobs.job_type -> job_types.id) are added for referential
 * integrity; they don't change any field name or enum value.
 */

// ---------------------------------------------------------------------------
// Enums (values copied verbatim from AGENTS.md §5 — do not invent values)
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["seeker", "employer"]);

export const residenceStatusEnum = pgEnum("residence_status", [
  "有居留",
  "办理中",
  "学生居留",
  "家庭居留",
  "无居留",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "draft",
  "active",
  "paused",
  "filled",
  "closed",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "viewed",
  "contacted",
  "hired",
  "rejected",
  "withdrawn",
]);

export const storeVerificationStatusEnum = pgEnum("store_verification_status", [
  "unverified",
  "pending",
  "verified",
  "rejected",
]);

export const jobResidenceRequiredEnum = pgEnum("job_residence_required", [
  "none",
  "prefer",
  "required",
]);

export const jobSalaryPeriodEnum = pgEnum("job_salary_period", [
  "hour",
  "day",
  "month",
]);

export const reportTargetTypeEnum = pgEnum("report_target_type", [
  "job",
  "store",
]);

// ---------------------------------------------------------------------------
// Reference tables
// ---------------------------------------------------------------------------

export const cities = pgTable("cities", {
  id: text("id").primaryKey(),
  name_zh: text("name_zh").notNull(),
  name_es: text("name_es").notNull(),
  region: text("region").notNull(),
});

export const jobTypes = pgTable("job_types", {
  id: text("id").primaryKey(),
  name_zh: text("name_zh").notNull(),
  name_es: text("name_es").notNull(),
  icon: text("icon").notNull(),
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  role: userRoleEnum("role").notNull(),
  phone: text("phone").notNull(),
  wechat: text("wechat"),
  name: text("name").notNull(),
  locale: text("locale").notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const seekerProfiles = pgTable("seeker_profiles", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => users.id),
  job_types: text("job_types").array().notNull().default([]),
  experience_years: integer("experience_years"),
  available_from: timestamp("available_from", { mode: "string" }),
  residence_status: residenceStatusEnum("residence_status"),
  expected_salary_min: numeric("expected_salary_min", {
    precision: 10,
    scale: 2,
    mode: "number",
  }),
  expected_salary_max: numeric("expected_salary_max", {
    precision: 10,
    scale: 2,
    mode: "number",
  }),
  preferred_cities: text("preferred_cities").array().notNull().default([]),
  live_in_ok: boolean("live_in_ok").notNull().default(false),
  languages: text("languages").array().notNull().default([]),
  bio: text("bio"),
  avatar: text("avatar"),
});

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export const stores = pgTable("stores", {
  id: text("id").primaryKey(),
  owner_user_id: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  name_zh: text("name_zh").notNull(),
  name_es: text("name_es").notNull(),
  city: text("city")
    .notNull()
    .references(() => cities.id),
  district: text("district").notNull(),
  address: text("address").notNull(),
  category: text("category").notNull(),
  cover_image: text("cover_image").notNull(),
  photos: text("photos").array().notNull().default([]),
  verification_status: storeVerificationStatusEnum("verification_status")
    .notNull()
    .default("unverified"),
  verified_at: timestamp("verified_at", { withTimezone: true, mode: "string" }),
  rating_avg: numeric("rating_avg", { precision: 3, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  rating_count: integer("rating_count").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    store_id: text("store_id")
      .notNull()
      .references(() => stores.id),
    title_zh: text("title_zh").notNull(),
    title_es: text("title_es").notNull(),
    job_type: text("job_type")
      .notNull()
      .references(() => jobTypes.id),
    city: text("city")
      .notNull()
      .references(() => cities.id),
    district: text("district").notNull(),
    salary_min: numeric("salary_min", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    salary_max: numeric("salary_max", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    salary_period: jobSalaryPeriodEnum("salary_period").notNull(),
    headcount: integer("headcount").notNull().default(1),
    schedule: text("schedule").notNull(),
    live_in: boolean("live_in").notNull().default(false),
    meals_included: boolean("meals_included").notNull().default(false),
    language_required: text("language_required").notNull(),
    residence_required: jobResidenceRequiredEnum("residence_required")
      .notNull()
      .default("none"),
    description_zh: text("description_zh").notNull(),
    description_es: text("description_es").notNull(),
    status: jobStatusEnum("status").notNull().default("draft"),
    published_at: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    views: integer("views").notNull().default(0),
  },
  (table) => [
    index("jobs_city_job_type_status_idx").on(
      table.city,
      table.job_type,
      table.status
    ),
    index("jobs_store_id_idx").on(table.store_id),
  ]
);

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export const applications = pgTable(
  "applications",
  {
    id: text("id").primaryKey(),
    job_id: text("job_id")
      .notNull()
      .references(() => jobs.id),
    seeker_user_id: text("seeker_user_id")
      .notNull()
      .references(() => users.id),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    message: text("message").notNull().default(""),
    contact_revealed: boolean("contact_revealed").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("applications_job_id_seeker_user_id_key").on(
      table.job_id,
      table.seeker_user_id
    ),
    index("applications_job_id_idx").on(table.job_id),
    index("applications_seeker_user_id_idx").on(table.seeker_user_id),
  ]
);

// ---------------------------------------------------------------------------
// Reviews & reports
// ---------------------------------------------------------------------------

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    store_id: text("store_id")
      .notNull()
      .references(() => stores.id),
    seeker_user_id: text("seeker_user_id")
      .notNull()
      .references(() => users.id),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("reviews_rating_range", sql`${table.rating} between 1 and 5`),
  ]
);

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  target_type: reportTargetTypeEnum("target_type").notNull(),
  // Polymorphic reference to jobs.id or stores.id depending on target_type;
  // not FK-constrained since it can point at either table.
  target_id: text("target_id").notNull(),
  reporter_user_id: text("reporter_user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
});
