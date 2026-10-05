"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/lib/types";

/**
 * Carries the logged-in account's role down to client components that
 * need it for UI decisions (which nav tabs to show — see BottomNav.tsx/
 * Header.tsx). The session cookie itself is httpOnly (lib/auth/session.ts)
 * so client code can never read it directly — this is the one place
 * app/layout.tsx's server-side getSession() result crosses into client
 * components. null means either not logged in, or a role-less state;
 * consumers treat null the same as "seeker" for nav purposes (see
 * lib/nav-tabs.ts's callers) to keep the pre-login browsing experience
 * unchanged.
 */
const SessionRoleContext = createContext<UserRole | null>(null);

export function SessionProvider({
  role,
  children,
}: {
  role: UserRole | null;
  children: React.ReactNode;
}) {
  return (
    <SessionRoleContext.Provider value={role}>
      {children}
    </SessionRoleContext.Provider>
  );
}

export function useSessionRole(): UserRole | null {
  return useContext(SessionRoleContext);
}
