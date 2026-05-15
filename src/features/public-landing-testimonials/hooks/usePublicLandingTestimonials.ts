"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
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

  useEffect(() => {
    if (!organizacionId) {
      setTestimonials([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    void publicLandingTestimonialService
      .listByOrganizationId(organizacionId)
      .then((rows) => {
        setTestimonials(rows);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las valoraciones.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [organizacionId]);

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

    return updated;
  }

  return {
    testimonials,
    isLoading,
    error,
    updateStatus,
    PublicLandingTestimonialValidationError,
  };
}
