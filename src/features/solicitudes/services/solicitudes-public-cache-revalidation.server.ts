import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import {
  PUBLIC_GALLERY_CACHE_TAG,
  PUBLIC_REQUEST_CONFIG_CACHE_TAG,
  PUBLIC_TESTIMONIALS_CACHE_TAG,
} from "@/features/solicitudes/services/solicitudes-public-cache.server";

export function revalidatePublicLandingCaches(slug?: string | null) {
  revalidateTag(PUBLIC_REQUEST_CONFIG_CACHE_TAG, "max");
  revalidateTag(PUBLIC_GALLERY_CACHE_TAG, "max");
  revalidateTag(PUBLIC_TESTIMONIALS_CACHE_TAG, "max");

  const normalizedSlug = slug?.trim();

  if (normalizedSlug) {
    revalidatePath(`/solicitud/${normalizedSlug}`);
  }
}
