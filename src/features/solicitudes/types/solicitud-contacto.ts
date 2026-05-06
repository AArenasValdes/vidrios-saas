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
