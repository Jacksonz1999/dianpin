/**
 * Small hand-written inline SVG icons for the bottom tab bar — replaces
 * emoji characters (🔍📨👤📋➕) with real vector icons. Written by hand
 * instead of pulling in an icon library (e.g. lucide-react): this app
 * only ever needed 5 icons, and AGENTS.md's "no heavy UI libraries" rule
 * is in the same spirit of preferring small hand-written components over
 * a new dependency for something this size.
 *
 * All icons share the same 24x24 viewBox / stroke style so they line up
 * visually. `aria-hidden` is set on every icon — the tab's visible text
 * label is what a screen reader announces, matching how the app already
 * marks decorative glyphs (see BottomNav.tsx).
 */

type IconProps = { className?: string };

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <line x1="21" y1="3" x2="11" y2="13" />
      <polygon points="21 3 14 21 11 13 3 10 21 3" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function ClipboardIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="13" y2="18" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
      <path d="M16.5 4.5c1.6.4 2.8 1.8 2.8 3.5s-1.2 3.1-2.8 3.5" />
      <path d="M18 14.2c1.9.5 3.3 2.1 3.5 4.3" />
    </svg>
  );
}
