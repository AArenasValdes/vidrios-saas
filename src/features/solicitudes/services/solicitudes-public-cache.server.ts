import "server-only";

import { unstable_cache } from "next/cache";

import { getPublicGalleryByOrganizationId } from "@/features/landing-gallery/repositories/landing-gallery-server.repository";
import { getApprovedPublicLandingTestimonialsByOrganizationId } from "@/features/public-landing-testimonials/repositories/public-landing-testimonial-server.repository";
import { solicitudesContactoService } from "@/features/solicitudes/services/solicitudes-contacto.service";

const PUBLIC_REQUEST_CONFIG_REVALIDATE_SECONDS = 300;
const PUBLIC_GALLERY_REVALIDATE_SECONDS = 300;
const PUBLIC_TESTIMONIALS_REVALIDATE_SECONDS = 300;

const getCachedPublicRequestConfigBySlug = unstable_cache(
  async (slug: string) => {
    return solicitudesContactoService.getPublicRequestConfig(slug);
  },
  ["solicitudes-public-request-config"],
  {
    revalidate: PUBLIC_REQUEST_CONFIG_REVALIDATE_SECONDS,
  }
);

const getCachedPublicGalleryItems = unstable_cache(
  async (organizationId: string | number) => {
    return getPublicGalleryByOrganizationId(organizationId);
  },
  ["solicitudes-public-gallery"],
  {
    revalidate: PUBLIC_GALLERY_REVALIDATE_SECONDS,
  }
);

const getCachedApprovedTestimonials = unstable_cache(
  async (organizationId: string | number) => {
    return getApprovedPublicLandingTestimonialsByOrganizationId(organizationId);
  },
  ["solicitudes-public-testimonials"],
  {
    revalidate: PUBLIC_TESTIMONIALS_REVALIDATE_SECONDS,
  }
);

export async function getCachedPublicRequestConfig(slug: string) {
  return getCachedPublicRequestConfigBySlug(slug);
}

export async function getCachedPublicGalleryByOrganizationId(
  organizationId: string | number
) {
  return getCachedPublicGalleryItems(organizationId);
}

export async function getCachedApprovedPublicTestimonialsByOrganizationId(
  organizationId: string | number
) {
  return getCachedApprovedTestimonials(organizationId);
}
