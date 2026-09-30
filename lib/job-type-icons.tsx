import {
  Bike,
  ChefHat,
  CookingPot,
  KeyRound,
  Package,
  ShoppingBag,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * job_types.icon (db/schema.ts) still stores an emoji per lib/seed.ts row,
 * but the UI no longer renders it — mixed emoji/vector iconography looked
 * inconsistent next to the header's hand-drawn SVG icons (components/icons).
 * This maps each seeded job_type id to a lucide-react icon instead. A
 * job_type id with no entry here falls back to Package rather than
 * rendering nothing.
 */
const JOB_TYPE_ICONS: Record<string, LucideIcon> = {
  cashier: Wallet,
  clerk: ShoppingBag,
  waiter: Utensils,
  chef: ChefHat,
  kitchen_helper: CookingPot,
  stocker: Package,
  delivery: Bike,
  manager: KeyRound,
};

/**
 * Returns a rendered element (not the component reference) — assigning a
 * PascalCase variable to a looked-up component and using it as a JSX tag
 * trips eslint's react-hooks/static-components rule, which can't tell that
 * apart from actually defining a component during render.
 */
export function renderJobTypeIcon(jobTypeId: string, className?: string) {
  const Icon = JOB_TYPE_ICONS[jobTypeId] ?? Package;
  return <Icon className={className} aria-hidden="true" />;
}
