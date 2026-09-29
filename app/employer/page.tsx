import { getDemoEmployerId, getJobsByStore, getStoresByOwner } from "@/lib/db";
import {
  EmployerDashboardView,
  type StoreWithJobs,
} from "@/components/EmployerDashboardView";

export const dynamic = "force-dynamic";

export default async function EmployerDashboardPage() {
  const employerId = await getDemoEmployerId();
  const stores = await getStoresByOwner(employerId);

  const groups: StoreWithJobs[] = await Promise.all(
    stores.map(async (store) => ({
      store,
      jobs: await getJobsByStore(store.id),
    }))
  );

  return <EmployerDashboardView groups={groups} />;
}
