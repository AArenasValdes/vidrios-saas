import type { EntityId } from "@/types/common";

export type OrganizationProfile = {
  organizationId: EntityId | null;
  empresaNombre: string;
  empresaLogoUrl: string | null;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaEmail: string;
  brandColor: string;
  formaPago: string;
  creadoEn: string | null;
  actualizadoEn: string | null;
};

export type UpdateOrganizationProfileInput = {
  empresaNombre: string;
  empresaLogoUrl: string | null;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaEmail: string;
  brandColor: string;
  formaPago: string;
};
