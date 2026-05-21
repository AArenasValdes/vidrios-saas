"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";

type TrackedExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  trackingLocation: string;
  trackingSource: string;
  trackingLabel?: string;
  empresaSlug?: string;
  quoteCode?: string;
};

export function TrackedExternalLink({
  trackingLocation,
  trackingSource,
  trackingLabel,
  empresaSlug,
  quoteCode,
  onClick,
  ...props
}: TrackedExternalLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    googleTagService.trackWhatsappClick({
      source: trackingSource,
      location: trackingLocation,
      label: trackingLabel,
      empresaSlug,
      quoteCode,
    });

    onClick?.(event);
  }

  return <a {...props} onClick={handleClick} />;
}
