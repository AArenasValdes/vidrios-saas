import type { SolicitudPublicaHorarioDia } from "@/features/organization-profile/types/organization-profile";
import type { PublicLandingService } from "@/features/organization-profile/types/organization-profile";

export type AyudaSolicitudContacto = "demo" | "cotizacion" | "ventas";
export type ContextoSolicitudContacto = "landing" | "empresa-publica";

export type EstadoSolicitudContacto =
  | "nueva"
  | "contactada"
  | "cerrada"
  | "descartada";

export type SolicitudContacto = {
  id: string;
  organizationId: string | number | null;
  nombre: string;
  empresa: string;
  correo: string | null;
  telefono: string | null;
  contacto: string | null;
  tipoTrabajo: string | null;
  mensaje: string | null;
  ayuda: AyudaSolicitudContacto;
  contexto: ContextoSolicitudContacto;
  estado: EstadoSolicitudContacto;
  origen: string;
  ip: string | null;
  userAgent: string | null;
  creadoEn: string | null;
  actualizadoEn: string | null;
  contactadaAt: string | null;

  // UTM tracking
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  sourceUrl: string | null;
};

export type CrearSolicitudContactoInput = {
  nombre: string;
  empresa: string;
  correo: string;
  telefono: string;
  ayuda: AyudaSolicitudContacto;
  origen?: string;
  ip?: string | null;
  userAgent?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  sourceUrl?: string | null;
};

export type SolicitudEmpresaPublicaConfig = {
  organizationId: string | number;
  empresaNombre: string;
  empresaLogoUrl: string | null;
  empresaDireccion: string;
  empresaTelefono: string;
  empresaEmail: string;
  brandColor: string;
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
  secondaryColor: string;
  heroMode: "image" | "gradient";
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

export type CrearSolicitudEmpresaInput = {
  organizationId: string | number;
  empresa: string;
  nombre: string;
  contacto: string;
  tipoTrabajo: string;
  mensaje?: string;
  origen?: string;
  ip?: string | null;
  userAgent?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  sourceUrl?: string | null;
};
