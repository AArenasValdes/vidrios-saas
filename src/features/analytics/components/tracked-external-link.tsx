"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";

type TrackedExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  trackingLocation: string;
  trackingSource: string;
  trackingLabel?: string;
  empresaSlug?: string;
  quoteCode?: string;
  trackingEventName?: string;
};

export function TrackedExternalLink({
  trackingLocation,
  trackingSource,
  trackingLabel,
  empresaSlug,
  quoteCode,
  trackingEventName,
  onClick,
  ...props
}: TrackedExternalLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (trackingEventName) {
      googleTagService.trackEvent(trackingEventName, {
        event_category: trackingSource,
        event_label: trackingLabel ?? trackingLocation,
        source: trackingSource,
        location: trackingLocation,
        empresa_slug: empresaSlug,
        quote_code: quoteCode,
      });
    } else {
      googleTagService.trackWhatsappClick({
        source: trackingSource,
        location: trackingLocation,
        label: trackingLabel,
        empresaSlug,
        quoteCode,
      });
    }

    onClick?.(event);
  }

  return <a {...props} onClick={handleClick} />;
}
