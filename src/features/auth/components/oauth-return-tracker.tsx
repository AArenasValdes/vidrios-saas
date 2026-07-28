"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { googleTagService } from "@/features/analytics/services/google-tag.service";
import type { AuthOAuthProvider } from "@/features/auth/types/auth";

function isTrackedOAuthEvent(event: string) {
  return (
    event.endsWith("_oauth_returned") ||
    event.endsWith("_existing_login") ||
    event.endsWith("_signup_started")
  );
}

function resolveProvider(providerParam: string | null): AuthOAuthProvider | null {
  return providerParam === "google" ? "google" : null;
}

export function OAuthReturnTracker() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const oauthEvent = searchParams.get("oauth_event");
  const oauthProvider = searchParams.get("oauth_provider");

  useEffect(() => {
    if (!oauthEvent || !isTrackedOAuthEvent(oauthEvent)) {
      return;
    }

    const provider = resolveProvider(oauthProvider);

    if (!provider || !oauthEvent.startsWith("google_")) {
      return;
    }
    const returnedEvent = `${provider}_oauth_returned`;

    googleTagService.trackEvent(returnedEvent, {
      event_category: "auth",
      event_label: "oauth_callback",
      next_path: pathname,
      oauth_provider: provider,
    });

    if (oauthEvent !== returnedEvent) {
      googleTagService.trackEvent(oauthEvent, {
        event_category: "auth",
        event_label: "oauth_callback",
        next_path: pathname,
        oauth_provider: provider,
      });
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("oauth_event");
    nextParams.delete("oauth_provider");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [oauthEvent, oauthProvider, pathname, router, searchParams]);

  return null;
}
