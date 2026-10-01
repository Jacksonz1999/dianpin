"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "dianpin_saved_jobs";

function readSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeSavedIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Private browsing / full quota — saves just don't persist this session.
  }
}

/**
 * "收藏" (WP-B3) — plain localStorage, no backend and no login required,
 * no state-management library (AGENTS.md §2/§8 rule out heavy
 * dependencies for something this small). Explicit simplification,
 * called out in the WP-B PR description: logging in does NOT merge these
 * local saves into an account — they just stay in this browser's
 * localStorage either way, with no cross-device sync.
 */
export function useSavedJobs() {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    // Read after mount, not in a lazy useState initializer — localStorage
    // doesn't exist during SSR, and reading it before mount would mismatch
    // the server-rendered markup the same way LocaleProvider's locale
    // restore would.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedIds(readSavedIds());
  }, []);

  const isSaved = useCallback((jobId: string) => savedIds.includes(jobId), [savedIds]);

  const toggleSaved = useCallback((jobId: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId];
      writeSavedIds(next);
      return next;
    });
  }, []);

  return { savedIds, isSaved, toggleSaved };
}
