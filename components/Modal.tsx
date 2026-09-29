"use client";

import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-t-2xl bg-[var(--color-surface)] p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xl text-[var(--color-text-muted)]"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
