import type { ComponentType } from "react";
import { ClipboardIcon, PlusIcon, SearchIcon, SendIcon, UserIcon } from "@/components/icons";

export type NavTab = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Shared between components/BottomNav.tsx (mobile) and components/Header.tsx
 * (desktop) so the two nav surfaces can't drift out of sync — same tabs,
 * same order, same icons, just rendered differently per breakpoint.
 */
export function getNavTabs(isEmployer: boolean, t: Translate): NavTab[] {
  return isEmployer
    ? [
        { href: "/employer", label: t("nav.employer.dashboard"), Icon: ClipboardIcon },
        { href: "/employer/new", label: t("nav.employer.post"), Icon: PlusIcon },
        { href: "/employer/me", label: t("nav.employer.me"), Icon: UserIcon },
      ]
    : [
        { href: "/", label: t("nav.seeker.jobs"), Icon: SearchIcon },
        { href: "/me/applications", label: t("nav.seeker.applications"), Icon: SendIcon },
        { href: "/me", label: t("nav.seeker.me"), Icon: UserIcon },
      ];
}
