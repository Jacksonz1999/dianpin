import { getCities, getJobTypes } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { SeekerPostCreateForm } from "@/components/SeekerPostCreateForm";

export const dynamic = "force-dynamic";

export default async function NewSeekerPostPage() {
  await requireRole("seeker", "/me/posts/new");
  const [cities, jobTypes] = await Promise.all([getCities(), getJobTypes()]);

  return <SeekerPostCreateForm cities={cities} jobTypes={jobTypes} />;
}
