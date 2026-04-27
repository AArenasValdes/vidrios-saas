import type { PreferredProvider } from "@/features/cotizaciones/services/component-suggestions.service";
import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
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
  proveedorPreferido: PreferredProvider;
  modoPrecioPreferido: PricingMode;
  margenDefecto: number;
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
  margenDefecto: number;
};
