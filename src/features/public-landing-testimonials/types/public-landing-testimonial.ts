import type { EntityId } from "@/types/common";

export type PublicLandingTestimonialStatus = "pendiente" | "aprobada" | "oculta";

export type PublicLandingTestimonial = {
  id: EntityId;
  organizationId: EntityId;
  nombreCorto: string;
  comentario: string;
  estrellas: number;
  estado: PublicLandingTestimonialStatus;
  creadoEn: string | null;
  actualizadoEn: string | null;
  aprobadoEn: string | null;
  ocultadoEn: string | null;
};

export type CreatePublicLandingTestimonialInput = {
  organizationId: EntityId;
  nombreCorto: string;
  comentario: string;
  estrellas: number;
};

export type UpdatePublicLandingTestimonialInput = {
  estado: PublicLandingTestimonialStatus;
};
