import type { EntityId } from "@/types/common";

export const LINE_TEMPLATE_MATERIALS = ["Aluminio", "PVC"] as const;
export type CotizacionLineTemplateMaterial = (typeof LINE_TEMPLATE_MATERIALS)[number];

export type CotizacionLineTemplate = {
  id: EntityId;
  organizationId: EntityId;
  nombre: string;
  material: CotizacionLineTemplateMaterial;
  precioM2Sugerido: number;
  minimoCobrable: number;
  redondeoPrecio: number;
  isActive: boolean;
  sortOrder: number;
  creadoEn: string | null;
  actualizadoEn: string | null;
  eliminadoEn: string | null;
};

export type CreateCotizacionLineTemplateInput = {
  organizationId: EntityId;
  nombre: string;
  material: CotizacionLineTemplateMaterial;
  precioM2Sugerido: number;
  minimoCobrable?: number;
  redondeoPrecio?: number;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateCotizacionLineTemplateInput = {
  nombre?: string;
  material?: CotizacionLineTemplateMaterial;
  precioM2Sugerido?: number;
  minimoCobrable?: number;
  redondeoPrecio?: number;
  isActive?: boolean;
  sortOrder?: number;
};
