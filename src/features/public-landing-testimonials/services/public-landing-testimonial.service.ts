import {
  publicLandingTestimonialRepository,
  type PublicLandingTestimonialRepository,
} from "@/features/public-landing-testimonials/repositories/public-landing-testimonial.repository";
import type { EntityId } from "@/types/common";
import type {
  PublicLandingTestimonialStatus,
} from "@/features/public-landing-testimonials/types/public-landing-testimonial";

type PublicLandingTestimonialServiceDeps = {
  repository?: PublicLandingTestimonialRepository;
};

const MAX_SHORT_NAME_LENGTH = 40;
const MAX_COMMENT_LENGTH = 220;

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export class PublicLandingTestimonialValidationError extends Error {}

export function validatePublicLandingTestimonialInput(input: {
  nombreCorto: string;
  comentario: string;
  estrellas: number;
}) {
  const nombreCorto = normalizeText(input.nombreCorto).slice(
    0,
    MAX_SHORT_NAME_LENGTH
  );
  const comentario = normalizeText(input.comentario).slice(
    0,
    MAX_COMMENT_LENGTH
  );

  if (input.estrellas < 1 || input.estrellas > 5) {
    throw new PublicLandingTestimonialValidationError(
      "Selecciona una valoracion entre 1 y 5 estrellas."
    );
  }

  if (comentario.length < 8) {
    throw new PublicLandingTestimonialValidationError(
      "Escribe un comentario breve para enviar tu valoracion."
    );
  }

  return {
    nombreCorto,
    comentario,
    estrellas: input.estrellas,
  };
}

export function createPublicLandingTestimonialService(
  deps: PublicLandingTestimonialServiceDeps = {}
) {
  const repository = deps.repository ?? publicLandingTestimonialRepository;

  return {
    async listByOrganizationId(organizationId: EntityId) {
      return repository.listByOrganizationId(organizationId);
    },

    async updateStatus(
      id: EntityId,
      organizationId: EntityId,
      estado: PublicLandingTestimonialStatus
    ) {
      return repository.update(id, organizationId, { estado });
    },
  };
}

export const publicLandingTestimonialService =
  createPublicLandingTestimonialService();
