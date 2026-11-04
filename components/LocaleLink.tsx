"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useLocale } from "./LocaleProvider";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * Drop-in replacement for next/link on public pages: keeps every internal
 * link inside the current language cluster, so a crawler following links
 * from a Spanish page stays on /es/… and doesn't fall back to the Chinese
 * canonical. Auth/employer/admin links work under either prefix too, since
 * proxy.ts rewrites the whole path.
 */
export function LocaleLink({ href, ...rest }: Props) {
  const { href: localizedHref } = useLocale();
  return <Link href={localizedHref(href)} {...rest} />;
}
