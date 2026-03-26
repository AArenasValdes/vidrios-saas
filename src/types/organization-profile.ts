import type { EntityId } from "@/types/common";
import type { PreferredProvider } from "@/services/component-suggestions.service";
import type { PricingMode } from "@/types/pricing-mode";

export type OrganizationProfile = {
  organizationId: EntityId | null;
  empresaNombre: string;
  empresaLogoUrl: string | null;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaEmail: string;
  brandColor: string;
  formaPago: string;
  proveedorPreferido: PreferredProvider;
  modoPrecioPreferido: PricingMode;
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
  proveedorPreferido: PreferredProvider;
  modoPrecioPreferido: PricingMode;
};
