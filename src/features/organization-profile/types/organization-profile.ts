import type { PreferredProvider } from "@/features/cotizaciones/services/component-suggestions.service";
import type { PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import type {
  BillingPeriod,
  EffectiveSubscriptionState,
  PaymentMethod,
  PlanCode,
  PlanType,
  SubscriptionStatus,
} from "@/features/subscriptions/types/subscription";
import type { EntityId } from "@/types/common";
import type { OrganizationRegionSettings } from "@/features/organization-region/types/organization-region";

export type HeroMode = "image" | "gradient";
export type PublicScheduleDay = "0" | "1" | "2" | "3" | "4" | "5" | "6";
export type PublicLandingService =
  | "Ventanas de aluminio"
  | "Ventanas PVC"
  | "Termopanel"
  | "Shower door"
  | "Cierres de terraza"
  | "Barandas de vidrio"
  | "Puertas de vidrio"
  | "Mamparas"
  | "Espejos"
  | "Reparaciones"
  | "Otros";
export type SolicitudPublicaHorarioDia = {
  day: PublicScheduleDay;
  enabled: boolean;
  from: string;
  to: string;
};

export type OrganizationProfile = OrganizationRegionSettings & {
  organizationId: EntityId | null;
  empresaNombre: string;
  empresaLogoUrl: string | null;
  responsableComercial: string;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaEmail: string;
  brandColor: string;
  formaPago: string;
  solicitudPublicaSlug: string;
  solicitudPublicaDescripcionCorta: string;
  solicitudPublicaValor: string;
  solicitudPublicaMensajeConfianza: string;
  solicitudPublicaPrivacidad: string;
  solicitudPublicaHorarioDesde: string;
  solicitudPublicaHorarioHasta: string;
  solicitudPublicaDiasAtencion: string[];
  solicitudPublicaHorarioPorDia: SolicitudPublicaHorarioDia[];
  proveedorPreferido: PreferredProvider;
  modoPrecioPreferido: PricingMode;
  margenDefecto: number;
  creadoEn: string | null;
  actualizadoEn: string | null;
  publicName: string;
  publicSubtitle: string;
  publicZone: string;
  publicBusinessType: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  websiteUrl: string;
  publicServices: PublicLandingService[];
  finalCtaTitle: string;
  finalCtaSubtitle: string;
  finalCtaLabel: string;
  businessHoursNote: string;
  secondaryColor: string;
  heroMode: HeroMode;
  heroImageUrl: string | null;
  heroTitle: string;
  heroSubtitle: string;
  showGallery: boolean;
  showSchedule: boolean;
  showRating: boolean;
  ratingLabel: string;
  jobsCountLabel: string;
  formTitle: string;
  formSubtitle: string;
  isPublished: boolean;
  planCode: PlanCode | null;
  planType: PlanType | null;
  subscriptionStatus: SubscriptionStatus | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  billingPeriod: BillingPeriod | null;
  paymentMethod: PaymentMethod | null;
  lastPaymentAt: string | null;
  founderPriceLocked: boolean;
  subscription: EffectiveSubscriptionState;
};

export type UpdateOrganizationProfileInput = OrganizationRegionSettings & {
  empresaNombre: string;
  empresaLogoUrl: string | null;
  responsableComercial: string;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaEmail: string;
  brandColor: string;
  formaPago: string;
  solicitudPublicaSlug: string;
  solicitudPublicaDescripcionCorta: string;
  solicitudPublicaValor: string;
  solicitudPublicaMensajeConfianza: string;
  solicitudPublicaPrivacidad: string;
  solicitudPublicaHorarioDesde: string;
  solicitudPublicaHorarioHasta: string;
  solicitudPublicaDiasAtencion: string[];
  solicitudPublicaHorarioPorDia: SolicitudPublicaHorarioDia[];
  proveedorPreferido: PreferredProvider;
  modoPrecioPreferido: PricingMode;
  margenDefecto: number;
  publicName: string;
  publicSubtitle: string;
  publicZone: string;
  publicBusinessType: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  websiteUrl: string;
  publicServices: PublicLandingService[];
  finalCtaTitle: string;
  finalCtaSubtitle: string;
  finalCtaLabel: string;
  businessHoursNote: string;
  secondaryColor: string;
  heroMode: HeroMode;
  heroImageUrl: string | null;
  heroTitle: string;
  heroSubtitle: string;
  showGallery: boolean;
  showSchedule: boolean;
  showRating: boolean;
  ratingLabel: string;
  jobsCountLabel: string;
  formTitle: string;
  formSubtitle: string;
  isPublished: boolean;
};

export type ResolvedPublicLandingConfig = {
  countryCode: string;
  organizationId: EntityId | string | number;
  empresaNombre: string;
  empresaLogoUrl: string | null;
  responsableComercial: string;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaEmail: string;
  brandColor: string;
  secondaryColor: string;
  solicitudPublicaSlug: string;
  solicitudPublicaDescripcionCorta: string;
  solicitudPublicaValor: string;
  solicitudPublicaMensajeConfianza: string;
  solicitudPublicaPrivacidad: string;
  solicitudPublicaHorarioDesde: string;
  solicitudPublicaHorarioHasta: string;
  solicitudPublicaDiasAtencion: string[];
  solicitudPublicaHorarioPorDia: SolicitudPublicaHorarioDia[];
  publicName: string;
  publicSubtitle: string;
  publicZone: string;
  publicBusinessType: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  websiteUrl: string;
  publicServices: PublicLandingService[];
  finalCtaTitle: string;
  finalCtaSubtitle: string;
  finalCtaLabel: string;
  businessHoursNote: string;
  heroMode: HeroMode;
  heroImageUrl: string | null;
  heroTitle: string;
  heroSubtitle: string;
  showGallery: boolean;
  showSchedule: boolean;
  showRating: boolean;
  ratingLabel: string;
  jobsCountLabel: string;
  formTitle: string;
  formSubtitle: string;
  isPublished: boolean;
  planCode: string | null;
};
