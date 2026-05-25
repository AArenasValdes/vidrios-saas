"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { publicLandingCacheRepository } from "@/features/solicitudes/repositories/public-landing-cache.repository";
import {
  publicLandingTestimonialService,
  PublicLandingTestimonialValidationError,
} from "@/features/public-landing-testimonials/services/public-landing-testimonial.service";
import type {
  PublicLandingTestimonial,
  PublicLandingTestimonialStatus,
} from "@/features/public-landing-testimonials/types/public-landing-testimonial";

export function usePublicLandingTestimonials() {
  const { organizacionId } = useAuth();
  const [testimonials, setTestimonials] = useState<PublicLandingTestimonial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTestimonials = useCallback(async (organizationId: string | number) => {
    setIsLoading(true);
    setError(null);

    try {
      const rows = await publicLandingTestimonialService.listByOrganizationId(organizationId);
      setTestimonials(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las valoraciones.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!organizacionId) {
      return;
    }

    void refreshTestimonials(organizacionId);
  }, [organizacionId, refreshTestimonials]);

  async function updateStatus(
    id: string | number,
    estado: PublicLandingTestimonialStatus
  ) {
    if (!organizacionId) {
      throw new Error("No hay organizacion activa.");
    }

    setError(null);
    const updated = await publicLandingTestimonialService.updateStatus(
      id,
      organizacionId,
      estado
    );

    setTestimonials((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
    void publicLandingCacheRepository.revalidate().catch(() => false);

    return updated;
  }

  return {
    testimonials: organizacionId ? testimonials : [],
    isLoading: organizacionId ? isLoading : false,
    error: organizacionId ? error : null,
    updateStatus,
    PublicLandingTestimonialValidationError,
  };
}
