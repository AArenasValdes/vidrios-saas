"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { googleTagService } from "@/features/analytics/services/google-tag.service";

export function GoogleTagProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    googleTagService.configurePage();
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const query = searchParams?.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    const title =
      typeof document !== "undefined" ? document.title : undefined;

    googleTagService.trackPageView(pagePath, title);
  }, [pathname, searchParams]);

  return null;
}
